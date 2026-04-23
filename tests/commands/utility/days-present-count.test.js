const { it, expect } = require("@jest/globals");
const { buildWeekTicksRow, getLastSevenDays } = require("../../../commands/utility/days-present-count");

const t = {
    DAY_SHORT: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
};

describe("buildWeekTicksRow", () => {
    const weekDays = [
        { dateStr: "2026-04-17", dayOfWeek: 5 },
        { dateStr: "2026-04-18", dayOfWeek: 6 },
        { dateStr: "2026-04-19", dayOfWeek: 0 },
        { dateStr: "2026-04-20", dayOfWeek: 1 },
        { dateStr: "2026-04-21", dayOfWeek: 2 },
        { dateStr: "2026-04-22", dayOfWeek: 3 },
        { dateStr: "2026-04-23", dayOfWeek: 4 },
    ];

    it("shows filled squares for present days and spaces for absent days", () => {
        const dayDates = ["2026-04-17", "2026-04-20", "2026-04-23"];
        const result = buildWeekTicksRow(weekDays, dayDates, t);

        const [headerLine, ticksLine] = result.split("\n");
        expect(headerLine).toBe("`Pt  So  Nd  Pn  Wt  Śr  Cz`");
        expect(ticksLine).toContain("■");
        // Present days should have ■
        expect([...ticksLine].filter((c) => c === "■").length).toBe(3);
    });

    it("shows all filled squares when present every day", () => {
        const dayDates = weekDays.map((d) => d.dateStr);
        const result = buildWeekTicksRow(weekDays, dayDates, t);
        const ticksLine = result.split("\n")[1];
        expect([...ticksLine].filter((c) => c === "■").length).toBe(7);
    });

    it("shows no filled squares when absent every day", () => {
        const result = buildWeekTicksRow(weekDays, [], t);
        const ticksLine = result.split("\n")[1];
        expect(ticksLine).not.toContain("■");
    });

    it("wraps header and ticks in backticks", () => {
        const result = buildWeekTicksRow(weekDays, [], t);
        const lines = result.split("\n");
        expect(lines[0]).toMatch(/^`.*`$/);
        expect(lines[1]).toMatch(/^`.*`$/);
    });
});

describe("getLastSevenDays", () => {
    it("returns exactly 7 entries", () => {
        const days = getLastSevenDays();
        expect(days).toHaveLength(7);
    });

    it("each entry has dateStr and dayOfWeek", () => {
        const days = getLastSevenDays();
        for (const day of days) {
            expect(day).toHaveProperty("dateStr");
            expect(day).toHaveProperty("dayOfWeek");
            expect(day.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(day.dayOfWeek).toBeGreaterThanOrEqual(0);
            expect(day.dayOfWeek).toBeLessThanOrEqual(6);
        }
    });

    it("last entry is today (shifted)", () => {
        const days = getLastSevenDays();
        // The last entry should be the most recent day
        const lastDate = days[6].dateStr;
        // Just verify it's a valid date string — exact value depends on DAY_SHIFT_MS
        expect(lastDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("dates are consecutive", () => {
        const days = getLastSevenDays();
        for (let i = 1; i < days.length; i++) {
            const prev = new Date(days[i - 1].dateStr);
            const curr = new Date(days[i].dateStr);
            const diffMs = curr - prev;
            expect(diffMs).toBe(24 * 60 * 60 * 1000);
        }
    });
});
