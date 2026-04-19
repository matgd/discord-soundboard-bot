const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const JSON_PATH = path.join(__dirname, "dataStore/voice-time.json");
const DB_PATH = path.join(__dirname, "dataStore/voice-time.db");

if (!fs.existsSync(JSON_PATH)) {
    console.error("voice-time.json not found at", JSON_PATH);
    process.exit(1);
}

if (fs.existsSync(DB_PATH)) {
    console.error("voice-time.db already exists at", DB_PATH);
    console.error("Delete it first if you want to re-run the migration.");
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE voice_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        duration INTEGER NOT NULL
    );
    CREATE INDEX idx_voice_sessions_guild_joined
        ON voice_sessions (guild_id, joined_at);
    CREATE INDEX idx_voice_sessions_user
        ON voice_sessions (guild_id, user_id, joined_at);
`);

const insert = db.prepare(`
    INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration)
    VALUES (@guildId, @userId, @channelId, @joinedAt, @duration)
`);

const insertMany = db.transaction((entries) => {
    for (const entry of entries) {
        insert.run(entry);
    }
});

insertMany(data);

console.log(`Migrated ${data.length} voice session(s) to ${DB_PATH}`);

db.close();
