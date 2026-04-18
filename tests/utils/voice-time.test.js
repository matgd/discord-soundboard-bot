const { describe, it, expect, beforeEach } = require("@jest/globals");

jest.mock("node:fs");

let fs;
let voiceTime;

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    // Reset modules so each test gets a fresh activeSessions Map
    jest.resetModules();
    jest.mock("node:fs");

    fs = require("node:fs");
    fs.readFileSync.mockReturnValue("[]");
    fs.writeFileSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(true);

    voiceTime = require("../../utils/voiceTime");
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
    it("creates the file when it does not exist", () => {
        fs.existsSync.mockReturnValue(false);
        voiceTime.ensureVoiceTimeFileExists();
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining("voice-time.json"),
            "[]"
        );
    });

    it("does nothing when file already exists", () => {
        fs.existsSync.mockReturnValue(true);
        voiceTime.ensureVoiceTimeFileExists();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
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
            .mockReturnValueOnce(now + 20_000); // cutoff calculation in handleVoiceLeave

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");
        voiceTime.handleVoiceLeave("guild1", "user1");

        const voiceTimeWrites = fs.writeFileSync.mock.calls.filter(
            (call) => call[0].includes("voice-time.json")
        );
        expect(voiceTimeWrites).toHaveLength(1);
        const savedData = JSON.parse(voiceTimeWrites[0][1]);
        expect(savedData).toHaveLength(1);
        expect(savedData[0]).toMatchObject({
            guildId: "guild1",
            userId: "user1",
            channelId: "channel1",
            duration: 20_000,
        });
    });

    it("saves active sessions to disk on join and leave", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");

        // One writeFileSync for saveActiveSessions on join
        const activeSessionsWrites = fs.writeFileSync.mock.calls.filter(
            (call) => call[0].includes("active-sessions.json")
        );
        expect(activeSessionsWrites.length).toBe(1);
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

        // Only active-sessions.json writes, no voice-time.json write
        const voiceTimeWrites = fs.writeFileSync.mock.calls.filter(
            (call) => call[0].includes("voice-time.json")
        );
        expect(voiceTimeWrites).toHaveLength(0);
    });

    it("does nothing if leave is called without a prior join", () => {
        voiceTime.handleVoiceLeave("guild1", "unknownUser");
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("prunes entries older than 365 days on save", () => {
        const now = 1_000_000_000_000;
        const oldEntry = {
            guildId: "guild1",
            userId: "user2",
            channelId: "channel1",
            joinedAt: now - 366 * 24 * 60 * 60 * 1000, // 366 days ago
            duration: 60_000,
        };

        fs.readFileSync.mockReturnValue(JSON.stringify([oldEntry]));

        jest.spyOn(Date, "now")
            .mockReturnValueOnce(now) // joinedAt
            .mockReturnValueOnce(now) // saveActiveSessions in handleVoiceJoin
            .mockReturnValueOnce(now + 15_000) // duration calc
            .mockReturnValueOnce(now + 15_000) // saveActiveSessions in handleVoiceLeave
            .mockReturnValueOnce(now + 15_000); // cutoff calc

        voiceTime.handleVoiceJoin("guild1", "user1", "channel1");
        voiceTime.handleVoiceLeave("guild1", "user1");

        const voiceTimeWrites = fs.writeFileSync.mock.calls.filter(
            (call) => call[0].includes("voice-time.json")
        );
        expect(voiceTimeWrites).toHaveLength(1);
        const savedData = JSON.parse(voiceTimeWrites[0][1]);
        // Old entry should be pruned, only new entry remains
        expect(savedData).toHaveLength(1);
        expect(savedData[0].userId).toBe("user1");
    });
});

describe("recoverActiveSessions", () => {
    it("creates sessions for non-bot members in voice channels", () => {
        // No saved active sessions
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes("active-sessions.json")) throw new Error("ENOENT");
            return "[]";
        });

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
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes("active-sessions.json")) throw new Error("ENOENT");
            return "[]";
        });

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
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes("active-sessions.json")) throw new Error("ENOENT");
            return "[]";
        });

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

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes("active-sessions.json"))
                return JSON.stringify(savedSessions);
            return "[]";
        });

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

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes("active-sessions.json"))
                return JSON.stringify(savedSessions);
            return "[]";
        });

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

        // Should have written a completed session to voice-time.json
        const voiceTimeWrites = fs.writeFileSync.mock.calls.filter(
            (call) => call[0].includes("voice-time.json")
        );
        expect(voiceTimeWrites.length).toBeGreaterThanOrEqual(1);
        const savedData = JSON.parse(voiceTimeWrites[0][1]);
        expect(savedData[0]).toMatchObject({
            guildId: "guild1",
            userId: "user1",
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
        fs.writeFileSync.mockClear();

        voiceTime.flushActiveSessions();

        const voiceTimeWrites = fs.writeFileSync.mock.calls.filter(
            (call) => call[0].includes("voice-time.json")
        );
        expect(voiceTimeWrites).toHaveLength(1);
        const savedData = JSON.parse(voiceTimeWrites[0][1]);
        expect(savedData[0]).toMatchObject({
            guildId: "guild1",
            userId: "user1",
            duration: 60_000,
        });
    });
});

describe("getVoiceTimeLeaderboard", () => {
    it("aggregates completed sessions by user for a guild", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const data = [
            {
                guildId: "guild1",
                userId: "user1",
                channelId: "c1",
                joinedAt: now - 60_000,
                duration: 30_000,
            },
            {
                guildId: "guild1",
                userId: "user1",
                channelId: "c1",
                joinedAt: now - 120_000,
                duration: 50_000,
            },
            {
                guildId: "guild1",
                userId: "user2",
                channelId: "c1",
                joinedAt: now - 60_000,
                duration: 10_000,
            },
        ];
        fs.readFileSync.mockReturnValue(JSON.stringify(data));

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        expect(leaderboard.get("user1")).toBe(80_000);
        expect(leaderboard.get("user2")).toBe(10_000);
    });

    it("filters by guild", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const data = [
            {
                guildId: "guild1",
                userId: "user1",
                channelId: "c1",
                joinedAt: now - 60_000,
                duration: 30_000,
            },
            {
                guildId: "guild2",
                userId: "user1",
                channelId: "c1",
                joinedAt: now - 60_000,
                duration: 50_000,
            },
        ];
        fs.readFileSync.mockReturnValue(JSON.stringify(data));

        const leaderboard = voiceTime.getVoiceTimeLeaderboard("guild1", 7);
        expect(leaderboard.get("user1")).toBe(30_000);
    });

    it("excludes entries outside the time window", () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, "now").mockReturnValue(now);

        const data = [
            {
                guildId: "guild1",
                userId: "user1",
                channelId: "c1",
                joinedAt: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
                duration: 30_000,
            },
            {
                guildId: "guild1",
                userId: "user1",
                channelId: "c1",
                joinedAt: now - 60_000, // 1 minute ago
                duration: 10_000,
            },
        ];
        fs.readFileSync.mockReturnValue(JSON.stringify(data));

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
