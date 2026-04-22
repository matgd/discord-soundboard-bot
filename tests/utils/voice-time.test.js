const { describe, it, expect, beforeEach, afterEach } = require("@jest/globals");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

let voiceTime;
let tmpDir;
let dbPath;
let activeSessionsPath;

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();

    // Create a temp directory for each test's DB + active-sessions file
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vt-test-"));
    dbPath = path.join(tmpDir, "voice-time.db");
    activeSessionsPath = path.join(tmpDir, "active-sessions.json");

    // Mock path.join to redirect dataStore paths to our temp dir
    const originalJoin = path.join;
    jest.spyOn(path, "join").mockImplementation((...args) => {
        const result = originalJoin(...args);
        if (result.endsWith("dataStore/voice-time.db") || result.endsWith("dataStore\\voice-time.db")) {
            return dbPath;
        }
        if (result.endsWith("dataStore/active-sessions.json") || result.endsWith("dataStore\\active-sessions.json")) {
            return activeSessionsPath;
        }
        return result;
    });

    voiceTime = require("../../utils/voiceTime");
    // Initialize the DB
    voiceTime.ensureVoiceTimeFileExists();
});

afterEach(() => {
    voiceTime.closeDb();
    // Clean up temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("formatDuration", () => {
    it("returns minutes only when less than 1 hour", () => {
        expect(voiceTime.formatDuration(5 * 60_000)).toBe("5m");
    });

    it("returns 0m for 0 ms", () => {
        expect(voiceTime.formatDuration(0)).toBe("0m");
    });

    it("returns hours and minutes for >= 1 hour", () => {
        expect(voiceTime.formatDuration(2 * 60 * 60_000 + 15 * 60_000)).toBe(
            "2h 15m"
        );
    });

    it("returns hours and 0m for exact hours", () => {
        expect(voiceTime.formatDuration(3 * 60 * 60_000)).toBe("3h 0m");
    });

    it("floors partial minutes", () => {
        expect(voiceTime.formatDuration(90_000)).toBe("1m"); // 1.5 minutes
    });
});

describe("ensureVoiceTimeFileExists", () => {
    it("creates the database file when called", () => {
        // DB was already initialized in beforeEach
        expect(fs.existsSync(dbPath)).toBe(true);
    });
});

describe("handleVoiceJoin / handleVoiceLeave", () => {
    it("persists a session when user leaves after >10s", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now")
            .mockReturnValueOnce(now) // joinedAt inside handleVoiceJoin
            .mockReturnValueOnce(now) // saveActiveSessions in handleVoiceJoin
            .mockReturnValueOnce(now + 20_000) // Date.now() - session.joinedAt in handleVoiceLeave
            .mockReturnValueOnce(now + 20_000) // saveActiveSessions in handleVoiceLeave
            .mockReturnValueOnce(now + 20_000) // duration check in handleVoiceLeave
            .mockReturnValueOnce(now + 20_000); // pruneOldEntries

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");
        voiceTime.handleVoiceLeave("guild1", "user1");

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const rows = db.prepare("SELECT * FROM voice_sessions").all();
        db.close();

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            guild_id: "guild1",
            user_id: "user1",
            channel_id: "channel1",
            duration: 20_000,
        });
    });

    it("saves active sessions to disk on join", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        expect(fs.existsSync(activeSessionsPath)).toBe(true);
        const saved = JSON.parse(fs.readFileSync(activeSessionsPath, "utf8"));
        expect(saved["guild1:user1"]).toMatchObject({
            channelId: "channel1",
            joinedAt: now,
        });
    });

    it("ignores sessions shorter than 10 seconds", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now")
            .mockReturnValueOnce(now) // joinedAt
            .mockReturnValueOnce(now) // saveActiveSessions in handleVoiceJoin
            .mockReturnValueOnce(now + 5_000) // leave time (5s < 10s)
            .mockReturnValueOnce(now + 5_000); // saveActiveSessions in handleVoiceLeave

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");
        voiceTime.handleVoiceLeave("guild1", "user1");

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const rows = db.prepare("SELECT * FROM voice_sessions").all();
        db.close();

        expect(rows).toHaveLength(0);
    });

    it("does nothing if leave is called without a prior join", () => {
        voiceTime.handleVoiceLeave("guild1", "unknownUser");

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const rows = db.prepare("SELECT * FROM voice_sessions").all();
        db.close();

        expect(rows).toHaveLength(0);
    });

    it("prunes entries older than 365 days on save", () => {
        const now = 1_000_000_000_000;

        // Insert an old entry directly into the DB
        const Database = require("better-sqlite3");
        let db = new Database(dbPath);
        db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        ).run("guild1", "user2", "channel1", now - 366 * 24 * 60 * 60 * 1000, 60_000);
        db.close();

        jest.spyOn(Date, "now")
            .mockReturnValueOnce(now) // joinedAt
            .mockReturnValueOnce(now) // saveActiveSessions in handleVoiceJoin
            .mockReturnValueOnce(now + 15_000) // duration calc
            .mockReturnValueOnce(now + 15_000) // saveActiveSessions in handleVoiceLeave
            .mockReturnValueOnce(now + 15_000) // duration check
            .mockReturnValueOnce(now + 15_000); // pruneOldEntries cutoff

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");
        voiceTime.handleVoiceLeave("guild1", "user1");

        db = new Database(dbPath);
        const rows = db.prepare("SELECT * FROM voice_sessions").all();
        db.close();

        // Old entry should be pruned, only new entry remains
        expect(rows).toHaveLength(1);
        expect(rows[0].user_id).toBe("user1");
    });
});

describe("recoverActiveSessions", () => {
    it("creates sessions for non-bot members in voice channels", () => {
        const mockClient = {
            guilds: {
                cache: new Map([
                    [
                        "guild1",
                        {
                            id: "guild1",
                            channels: {
                                cache: new Map([
                                    [
                                        "vc1",
                                        {
                                            id: "vc1",
                                            isVoiceBased: () => true,
                                            members: new Map([
                                                [
                                                    "user1",
                                                    {
                                                        id: "user1",
                                                        user: { bot: false },
                                                    },
                                                ],
                                                [
                                                    "user2",
                                                    {
                                                        id: "user2",
                                                        user: { bot: false },
                                                    },
                                                ],
                                            ]),
                                        },
                                    ],
                                    [
                                        "text1",
                                        {
                                            id: "text1",
                                            isVoiceBased: () => false,
                                            members: new Map(),
                                        },
                                    ],
                                ]),
                            },
                        },
                    ],
                ]),
            },
        };

        voiceTime.recoverActiveSessions(mockClient);

        // Verify sessions were created by checking leaderboard
        const leaderboard = voiceTime.getVoiceTimeLeaderboard(
            "guild1",
            1
        );
        expect(leaderboard.has("user1")).toBe(true);
        expect(leaderboard.has("user2")).toBe(true);
    });

    it("skips bot users", () => {
        const mockClient = {
            guilds: {
                cache: new Map([
                    [
                        "guild1",
                        {
                            id: "guild1",
                            channels: {
                                cache: new Map([
                                    [
                                        "vc1",
                                        {
                                            id: "vc1",
                                            isVoiceBased: () => true,
                                            members: new Map([
                                                [
                                                    "bot1",
                                                    {
                                                        id: "bot1",
                                                        user: { bot: true },
                                                    },
                                                ],
                                            ]),
                                        },
                                    ],
                                ]),
                            },
                        },
                    ],
                ]),
            },
        };

        voiceTime.recoverActiveSessions(mockClient);

        const leaderboard = voiceTime.getVoiceTimeLeaderboard(
            "guild1",
            1
        );
        expect(leaderboard.has("bot1")).toBe(false);
    });

    it("skips non-voice channels", () => {
        const mockClient = {
            guilds: {
                cache: new Map([
                    [
                        "guild1",
                        {
                            id: "guild1",
                            channels: {
                                cache: new Map([
                                    [
                                        "text1",
                                        {
                                            id: "text1",
                                            isVoiceBased: () => false,
                                            members: new Map([
                                                [
                                                    "user1",
                                                    {
                                                        id: "user1",
                                                        user: { bot: false },
                                                    },
                                                ],
                                            ]),
                                        },
                                    ],
                                ]),
                            },
                        },
                    ],
                ]),
            },
        };

        voiceTime.recoverActiveSessions(mockClient);

        const leaderboard = voiceTime.getVoiceTimeLeaderboard(
            "guild1",
            1
        );
        expect(leaderboard.size).toBe(0);
    });

    it("restores original joinedAt from saved active sessions", () => {
        const now = 1_000_000_000_000;
        const joinedAt = now - 3600_000; // joined 1 hour ago
        jest.spyOn(Date, "now").mockReturnValue(now);

        const savedSessions = {
            "guild1:user1": { channelId: "vc1", joinedAt },
            _savedAt: now - 60_000, // saved 1 min ago
        };
        fs.writeFileSync(activeSessionsPath, JSON.stringify(savedSessions));

        const mockClient = {
            guilds: {
                cache: new Map([
                    [
                        "guild1",
                        {
                            id: "guild1",
                            channels: {
                                cache: new Map([
                                    [
                                        "vc1",
                                        {
                                            id: "vc1",
                                            isVoiceBased: () => true,
                                            members: new Map([
                                                [
                                                    "user1",
                                                    {
                                                        id: "user1",
                                                        user: { bot: false },
                                                    },
                                                ],
                                            ]),
                                        },
                                    ],
                                ]),
                            },
                        },
                    ],
                ]),
            },
        };

        voiceTime.recoverActiveSessions(mockClient);

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        // Should show ~1 hour, not ~0 (which would happen without restore)
        expect(leaderboard.get("user1")).toBe(3600_000);
    });

    it("finalizes sessions for users who left while bot was down", () => {
        const now = 1_000_000_000_000;
        const joinedAt = now - 3600_000; // joined 1 hour ago
        const savedAt = now - 60_000; // saved 1 min ago
        jest.spyOn(Date, "now").mockReturnValue(now);

        const savedSessions = {
            "guild1:user1": { channelId: "vc1", joinedAt },
            _savedAt: savedAt,
        };
        fs.writeFileSync(activeSessionsPath, JSON.stringify(savedSessions));

        // Empty server — user1 left while bot was down
        const mockClient = {
            guilds: {
                cache: new Map([
                    [
                        "guild1",
                        {
                            id: "guild1",
                            channels: {
                                cache: new Map([
                                    [
                                        "vc1",
                                        {
                                            id: "vc1",
                                            isVoiceBased: () => true,
                                            members: new Map(),
                                        },
                                    ],
                                ]),
                            },
                        },
                    ],
                ]),
            },
        };

        voiceTime.recoverActiveSessions(mockClient);

        // Should have written a completed session to the DB
        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const rows = db.prepare("SELECT * FROM voice_sessions").all();
        db.close();

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            guild_id: "guild1",
            user_id: "user1",
            duration: savedAt - joinedAt, // time up to last save
        });
    });
});

describe("flushActiveSessions", () => {
    it("persists all active sessions and clears the map", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        // Advance time
        Date.now.mockReturnValue(now + 60_000);

        voiceTime.flushActiveSessions();

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const rows = db.prepare("SELECT * FROM voice_sessions").all();
        db.close();

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            guild_id: "guild1",
            user_id: "user1",
            duration: 60_000,
        });
    });
});

describe("getVoiceTimeLeaderboard", () => {
    it("aggregates completed sessions by user for a guild", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", now - 60_000, 30_000);
        insert.run("guild1", "user1", "c1", now - 120_000, 50_000);
        insert.run("guild1", "user2", "c1", now - 60_000, 10_000);
        db.close();

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        expect(leaderboard.get("user1")).toBe(80_000);
        expect(leaderboard.get("user2")).toBe(10_000);
    });

    it("filters by guild", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", now - 60_000, 30_000);
        insert.run("guild2", "user1", "c1", now - 60_000, 50_000);
        db.close();

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        expect(leaderboard.get("user1")).toBe(30_000);
    });

    it("excludes entries outside the time window", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", now - 2 * 24 * 60 * 60 * 1000, 30_000); // 2 days ago
        insert.run("guild1", "user1", "c1", now - 60_000, 10_000); // 1 minute ago
        db.close();

        // Only look back 1 day
        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 1);
        expect(leaderboard.get("user1")).toBe(10_000);
    });

    it("includes ongoing active sessions", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        // Move time forward 5 minutes
        Date.now.mockReturnValue(now + 5 * 60_000);

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        expect(leaderboard.get("user1")).toBe(5 * 60_000);
    });

    it("caps active session time to window when session started before cutoff", () => {
        const now = 1_000_000_000_000;
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Join 2 days ago
        jest.spyOn(Date, "now").mockReturnValue(now - 2 * oneDayMs);
        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        // Check leaderboard "now" with a 1-day window
        Date.now.mockReturnValue(now);
        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 1);

        // Should only count time within the 1-day window
        expect(leaderboard.get("user1")).toBe(oneDayMs);
    });

    it("returns empty map when no data exists", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        expect(leaderboard.size).toBe(0);
    });
});

describe("getDaysPresentLeaderboard", () => {
    it("returns distinct date arrays per user from completed sessions", () => {
        // Use noon timestamps to avoid 4AM boundary issues
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const day1 = new Date("2025-06-13T12:00:00Z").getTime(); // 2 days ago noon
        const day2 = new Date("2025-06-14T12:00:00Z").getTime(); // 1 day ago noon

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        // user1 present on 2 distinct days
        insert.run("guild1", "user1", "c1", day1, 60_000);
        insert.run("guild1", "user1", "c1", day2, 60_000);
        // user2 present on 1 day (two sessions same day)
        insert.run("guild1", "user2", "c1", day1, 30_000);
        insert.run("guild1", "user2", "c1", day1 + 60_000, 30_000);
        db.close();

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toEqual(["2025-06-13", "2025-06-14"]);
        expect(result.get("user2")).toEqual(["2025-06-13"]);
    });

    it("treats sessions before 4:00 AM as the previous day", () => {
        // Session at 2:00 AM on June 15 should count as June 14 (shifted day)
        const sessionAt2AM = new Date("2025-06-15T02:00:00Z").getTime();
        // Session at 10:00 PM on June 14 should also count as June 14
        const sessionAt10PM = new Date("2025-06-14T22:00:00Z").getTime();
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", sessionAt10PM, 60_000);
        insert.run("guild1", "user1", "c1", sessionAt2AM, 60_000);
        db.close();

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toEqual(["2025-06-14"]); // same shifted day
    });

    it("treats a session at 4:00 AM as the new day", () => {
        // Session at 3:59 AM on June 15 → shifted day = June 14
        const before4AM = new Date("2025-06-15T03:59:00Z").getTime();
        // Session at 4:00 AM on June 15 → shifted day = June 15
        const at4AM = new Date("2025-06-15T04:00:00Z").getTime();
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", before4AM, 60_000);
        insert.run("guild1", "user1", "c1", at4AM, 60_000);
        db.close();

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toEqual(["2025-06-14", "2025-06-15"]);
    });

    it("filters by guild", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", now - 60_000, 30_000);
        insert.run("guild2", "user1", "c1", now - 60_000, 30_000);
        db.close();

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toHaveLength(1);
        expect(result.size).toBe(1);
    });

    it("excludes entries outside the time window", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run("guild1", "user1", "c1", now - 10 * 24 * 60 * 60 * 1000, 60_000); // 10 days ago
        insert.run("guild1", "user1", "c1", now - 60_000, 60_000); // today
        db.close();

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 1);
        expect(result.get("user1")).toHaveLength(1);
    });

    it("includes today for active sessions not yet in DB", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toEqual(["2025-06-15"]);
    });

    it("does not double-count today if active user already has DB entry for today", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        // Insert a completed session for today (well within the shifted day)
        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        ).run("guild1", "user1", "c1", now - 60_000, 30_000);
        db.close();

        // User is also currently in voice
        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toEqual(["2025-06-15"]); // not duplicated
    });

    it("returns empty map when no data exists", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.size).toBe(0);
    });

    it("ignores active sessions from other guilds", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        voiceTime.handleVoiceJoin("guild2", "user1", "channel1");

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.size).toBe(0);
    });

    it("returns dates in sorted order", () => {
        const now = new Date("2025-06-15T12:00:00Z").getTime();
        jest.spyOn(Date, "now").mockReturnValue(now);

        const Database = require("better-sqlite3");
        const db = new Database(dbPath);
        const insert = db.prepare(
            "INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at, duration) VALUES (?, ?, ?, ?, ?)",
        );
        // Insert in reverse order
        insert.run("guild1", "user1", "c1", new Date("2025-06-14T12:00:00Z").getTime(), 60_000);
        insert.run("guild1", "user1", "c1", new Date("2025-06-12T12:00:00Z").getTime(), 60_000);
        insert.run("guild1", "user1", "c1", new Date("2025-06-13T12:00:00Z").getTime(), 60_000);
        db.close();

        const result = voiceTime.getDaysPresentLeaderboard("guild1", 7);
        expect(result.get("user1")).toEqual(["2025-06-12", "2025-06-13", "2025-06-14"]);
    });
});
