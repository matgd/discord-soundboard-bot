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
    let cutoff;
    if (days === 0) {
        // "Today" = since 4 AM local time
        const now = new Date();
        now.setHours(4, 0, 0, 0);
        if (Date.now() < now.getTime()) {
            // Before 4 AM — use yesterday's 4 AM
            now.setDate(now.getDate() - 1);
        }
        cutoff = now.getTime();
    } else {
        cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    }

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
 * Returns the distinct shifted dates each user was present in voice for a given guild and time window.
 * Days are counted from 4:00 AM to 4:00 AM to avoid splitting late-night sessions across two days.
 * @param {string} guildId
 * @param {number} days - Number of days to look back
 * @returns {Map<string, string[]>} Map of userId -> array of date strings (YYYY-MM-DD, shifted)
 */
const DAY_SHIFT_MS = 4 * 60 * 60 * 1000; // 4 hours in ms

function getDaysPresentLeaderboard(guildId, days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get distinct shifted dates per user from completed sessions
    const rows = getDb()
        .prepare(
            `SELECT user_id, date((joined_at - ${DAY_SHIFT_MS}) / 1000, 'unixepoch') AS day
             FROM voice_sessions
             WHERE guild_id = ? AND joined_at >= ?
             GROUP BY user_id, day`,
        )
        .all(guildId, cutoff);

    const dates = new Map();
    for (const row of rows) {
        if (!dates.has(row.user_id)) dates.set(row.user_id, new Set());
        dates.get(row.user_id).add(row.day);
    }

    // Add current "shifted day" for any user currently in a voice channel in this guild
    const shiftedNow = new Date(Date.now() - DAY_SHIFT_MS);
    const todayStr = shiftedNow.toISOString().slice(0, 10);
    for (const [key] of activeSessions.entries()) {
        const [sessionGuildId, userId] = key.split(":");
        if (sessionGuildId !== guildId) continue;

        if (!dates.has(userId)) dates.set(userId, new Set());
        dates.get(userId).add(todayStr);
    }

    // Convert Sets to sorted arrays
    const result = new Map();
    for (const [userId, daySet] of dates.entries()) {
        result.set(userId, [...daySet].sort());
    }

    return result;
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
    DAY_SHIFT_MS,
    formatDuration,
    flushActiveSessions,
    closeDb,
};
