const fs = require("node:fs");
const path = require("node:path");

const DATA_PATH = path.join(__dirname, "../dataStore/voice-time.json");

// In-memory map of active voice sessions: Map<"guildId:userId", { channelId, joinedAt }>
const activeSessions = new Map();

function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    } catch {
        return [];
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function ensureVoiceTimeFileExists() {
    if (!fs.existsSync(DATA_PATH)) {
        fs.writeFileSync(DATA_PATH, "[]");
    }
}

/**
 * Records a user joining a voice channel.
 */
function handleVoiceJoin(guildId, userId, channelId) {
    const key = `${guildId}:${userId}`;
    activeSessions.set(key, { channelId, joinedAt: Date.now() });
}

/**
 * Records a user leaving a voice channel and persists the session.
 */
function handleVoiceLeave(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const session = activeSessions.get(key);
    if (!session) return;

    activeSessions.delete(key);

    const duration = Date.now() - session.joinedAt;
    // Ignore sessions shorter than 10 seconds (likely transient)
    if (duration < 10_000) return;

    const data = loadData();
    data.push({
        guildId,
        userId,
        channelId: session.channelId,
        joinedAt: session.joinedAt,
        duration,
    });

    // Prune entries older than 365 days
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const pruned = data.filter((e) => e.joinedAt >= cutoff);

    saveData(pruned);
}

/**
 * On bot startup, scan all voice channels and create sessions for users already connected.
 */
function recoverActiveSessions(client) {
    for (const guild of client.guilds.cache.values()) {
        for (const channel of guild.channels.cache.values()) {
            if (!channel.isVoiceBased()) continue;
            for (const member of channel.members.values()) {
                if (member.user.bot) continue;
                handleVoiceJoin(guild.id, member.id, channel.id);
            }
        }
    }
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
    const data = loadData();

    const totals = new Map();

    // Add completed sessions
    for (const entry of data) {
        if (entry.guildId !== guildId) continue;
        if (entry.joinedAt < cutoff) continue;
        const current = totals.get(entry.userId) || 0;
        totals.set(entry.userId, current + entry.duration);
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

module.exports = {
    ensureVoiceTimeFileExists,
    handleVoiceJoin,
    handleVoiceLeave,
    recoverActiveSessions,
    getVoiceTimeLeaderboard,
    formatDuration,
};
