const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "../dataStore/voice-time.db");
const ACTIVE_SESSIONS_PATH = path.join(__dirname, "../dataStore/active-sessions.json");

// In-memory map of active voice sessions: Map<"guildId:userId", { channelId, joinedAt }>
const activeSessions = new Map();

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");
        db.exec(`
            CREATE TABLE IF NOT EXISTS voice_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                joined_at INTEGER NOT NULL,
                duration INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_voice_sessions_guild_joined
                ON voice_sessions (guild_id, joined_at);
            CREATE INDEX IF NOT EXISTS idx_voice_sessions_user
                ON voice_sessions (guild_id, user_id, joined_at);
        `);
    }
    return db;
}

function ensureVoiceTimeFileExists() {
    getDb();
}

function insertSession(guildId, userId, channelId, joinedAt, duration) {
    getDb()
        .prepare(
            `INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration)
             VALUES (?, ?, ?, ?, ?)`,
        )
        .run(guildId, userId, channelId, joinedAt, duration);
}

function pruneOldEntries() {
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    getDb().prepare(`DELETE FROM voice_sessions WHERE joined_at < ?`).run(cutoff);
}

function saveActiveSessions() {
    const obj = {};
    for (const [key, session] of activeSessions.entries()) {
        obj[key] = { channelId: session.channelId, joinedAt: session.joinedAt };
    }
    obj._savedAt = Date.now();
    fs.writeFileSync(ACTIVE_SESSIONS_PATH, JSON.stringify(obj, null, 2));
}

function loadSavedActiveSessions() {
    try {
        return JSON.parse(fs.readFileSync(ACTIVE_SESSIONS_PATH, "utf8"));
    } catch {
        return null;
    }
}

/**
 * Records a user joining a voice channel.
 */
function handleVoiceJoin(guildId, userId, channelId) {
    const key = `${guildId}:${userId}`;
    activeSessions.set(key, { channelId, joinedAt: Date.now() });
    saveActiveSessions();
}

/**
 * Records a user leaving a voice channel and persists the session.
 */
function handleVoiceLeave(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const session = activeSessions.get(key);
    if (!session) return;

    activeSessions.delete(key);
    saveActiveSessions();

    const duration = Date.now() - session.joinedAt;
    // Ignore sessions shorter than 10 seconds (likely transient)
    if (duration < 10_000) return;

    insertSession(guildId, userId, session.channelId, session.joinedAt, duration);
    pruneOldEntries();
}

/**
 * On bot startup, scan all voice channels and create sessions for users already connected.
 * Restores original joinedAt from saved sessions when available.
 */
function recoverActiveSessions(client) {
    const saved = loadSavedActiveSessions();
    const savedAt = saved?._savedAt || Date.now();

    // Collect currently connected users
    const currentUsers = new Set();
    for (const guild of client.guilds.cache.values()) {
        for (const channel of guild.channels.cache.values()) {
            if (!channel.isVoiceBased()) continue;
            for (const member of channel.members.values()) {
                if (member.user.bot) continue;
                const key = `${guild.id}:${member.id}`;
                currentUsers.add(key);

                // Restore original joinedAt if we have a saved session
                if (saved && saved[key]) {
                    activeSessions.set(key, {
                        channelId: channel.id,
                        joinedAt: saved[key].joinedAt,
                    });
                } else {
                    activeSessions.set(key, {
                        channelId: channel.id,
                        joinedAt: Date.now(),
                    });
                }
            }
        }
    }

    // Finalize sessions for users who left while bot was down
    if (saved) {
        for (const [key, session] of Object.entries(saved)) {
            if (key === "_savedAt") continue;
            if (currentUsers.has(key)) continue;

            // User was in voice before restart but is no longer — record up to savedAt
            const duration = savedAt - session.joinedAt;
            if (duration < 10_000) continue;

            const [guildId, userId] = key.split(":");
            insertSession(guildId, userId, session.channelId, session.joinedAt, duration);
        }
        pruneOldEntries();
    }

    saveActiveSessions();

    const count = activeSessions.size;
    if (count > 0) {
        console.log(`Recovered ${count} active voice session(s) on startup.`);
    }
}

/**
 * Returns aggregated voice time per user for a given guild and time window.
 * @param {string} guildId
 * @param {number} days - Number of days to look back
 * @returns {Map<string, number>} Map of userId -> total duration in ms
 */
function getVoiceTimeLeaderboard(guildId, days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const rows = getDb()
        .prepare(
            `SELECT user_id, SUM(duration) AS total
             FROM voice_sessions
             WHERE guild_id = ? AND joined_at >= ?
             GROUP BY user_id`,
        )
        .all(guildId, cutoff);

    const totals = new Map();
    for (const row of rows) {
        totals.set(row.user_id, row.total);
    }

    // Add ongoing sessions
    for (const [key, session] of activeSessions.entries()) {
        const [sessionGuildId, userId] = key.split(":");
        if (sessionGuildId !== guildId) continue;
        if (session.joinedAt < cutoff) {
            // Session started before cutoff, only count time within window
            const current = totals.get(userId) || 0;
            totals.set(userId, current + (Date.now() - cutoff));
        } else {
            const current = totals.get(userId) || 0;
            totals.set(userId, current + (Date.now() - session.joinedAt));
        }
    }

    return totals;
}

/**
 * Returns the number of distinct days each user was present in voice for a given guild and time window.
 * @param {string} guildId
 * @param {number} days - Number of days to look back
 * @returns {Map<string, number>} Map of userId -> distinct day count
 */
function getDaysPresentLeaderboard(guildId, days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Count distinct dates (in local server time via UTC) per user from completed sessions
    const rows = getDb()
        .prepare(
            `SELECT user_id, COUNT(DISTINCT date(joined_at / 1000, 'unixepoch')) AS day_count
             FROM voice_sessions
             WHERE guild_id = ? AND joined_at >= ?
             GROUP BY user_id`,
        )
        .all(guildId, cutoff);

    const counts = new Map();
    for (const row of rows) {
        counts.set(row.user_id, row.day_count);
    }

    // Add today for any user currently in a voice channel in this guild
    const todayStr = new Date().toISOString().slice(0, 10);
    for (const [key] of activeSessions.entries()) {
        const [sessionGuildId, userId] = key.split(":");
        if (sessionGuildId !== guildId) continue;

        // Check if today is already counted from DB rows
        const alreadyHasToday = getDb()
            .prepare(
                `SELECT 1 FROM voice_sessions
                 WHERE guild_id = ? AND user_id = ? AND date(joined_at / 1000, 'unixepoch') = ?
                 LIMIT 1`,
            )
            .get(guildId, userId, todayStr);

        if (!alreadyHasToday) {
            counts.set(userId, (counts.get(userId) || 0) + 1);
        }
    }

    return counts;
}

/**
 * Formats milliseconds into a human-readable string like "2h 15m".
 */
function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Flushes all active sessions to completed data (for graceful shutdown).
 */
function flushActiveSessions() {
    const insertMany = getDb().transaction(() => {
        for (const [key, session] of activeSessions.entries()) {
            const duration = Date.now() - session.joinedAt;
            if (duration < 10_000) continue;

            const [guildId, userId] = key.split(":");
            insertSession(guildId, userId, session.channelId, session.joinedAt, duration);
        }
    });
    insertMany();
    pruneOldEntries();
    activeSessions.clear();
    saveActiveSessions();
}

/**
 * Closes the database connection (for graceful shutdown).
 */
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    ensureVoiceTimeFileExists,
    handleVoiceJoin,
    handleVoiceLeave,
    recoverActiveSessions,
    getVoiceTimeLeaderboard,
    getDaysPresentLeaderboard,
    formatDuration,
    flushActiveSessions,
    closeDb,
};
