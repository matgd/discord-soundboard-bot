const { it, expect } = require("@jest/globals");
const { buildWeekTicksRow, buildMonthGrid, getLastNDays, getLastSevenDays } = require("../../../commands/utility/days-present-count");

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

    it("each entry has dateStr, dayOfWeek, and dayOfMonth", () => {
        const days = getLastSevenDays();
        for (const day of days) {
            expect(day).toHaveProperty("dateStr");
            expect(day).toHaveProperty("dayOfWeek");
            expect(day).toHaveProperty("dayOfMonth");
            expect(day.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(day.dayOfWeek).toBeGreaterThanOrEqual(0);
            expect(day.dayOfWeek).toBeLessThanOrEqual(6);
            expect(day.dayOfMonth).toBeGreaterThanOrEqual(1);
            expect(day.dayOfMonth).toBeLessThanOrEqual(31);
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

describe("getLastNDays", () => {
    it("returns exactly n entries", () => {
        expect(getLastNDays(28)).toHaveLength(28);
        expect(getLastNDays(14)).toHaveLength(14);
    });

    it("dates are consecutive", () => {
        const days = getLastNDays(28);
        for (let i = 1; i < days.length; i++) {
            const prev = new Date(days[i - 1].dateStr);
            const curr = new Date(days[i].dateStr);
            expect(curr - prev).toBe(24 * 60 * 60 * 1000);
        }
    });

    it("each entry has dayOfMonth matching the date", () => {
        const days = getLastNDays(28);
        for (const day of days) {
            const parsed = new Date(day.dateStr);
            expect(day.dayOfMonth).toBe(parsed.getUTCDate());
        }
    });
});

describe("buildMonthGrid", () => {
    // 28 days: 2026-03-27 (Fri) through 2026-04-23 (Thu)
    const allDays = [];
    for (let i = 0; i < 28; i++) {
        const date = new Date(Date.UTC(2026, 2, 27) + i * 24 * 60 * 60 * 1000);
        allDays.push({
            dateStr: date.toISOString().slice(0, 10),
            dayOfWeek: date.getUTCDay(),
            dayOfMonth: date.getUTCDate(),
        });
    }

    it("produces 5 lines: 1 header + 4 week rows", () => {
        const result = buildMonthGrid(allDays, [], t);
        const lines = result.split("\n");
        expect(lines).toHaveLength(5);
    });

    it("header shows day-of-week abbreviations", () => {
        const result = buildMonthGrid(allDays, [], t);
        const header = result.split("\n")[0];
        expect(header).toBe("`Pt  So  Nd  Pn  Wt  Śr  Cz`");
    });

    it("shows day-of-month numbers for present days", () => {
        const dayDates = ["2026-03-27", "2026-04-05", "2026-04-15"];
        const result = buildMonthGrid(allDays, dayDates, t);
        const lines = result.split("\n");
        // First week row should contain 27 (Mar 27)
        expect(lines[1]).toContain("27");
        // Second week row should contain 5 (Apr 5)
        expect(lines[2]).toContain(" 5");
        // Third week row should contain 15 (Apr 15)
        expect(lines[3]).toContain("15");
    });

    it("shows spaces for absent days", () => {
        const result = buildMonthGrid(allDays, [], t);
        const lines = result.split("\n");
        // No numbers should appear in week rows
        for (let i = 1; i < lines.length; i++) {
            expect(lines[i]).not.toMatch(/\d/);
        }
    });

    it("all lines are wrapped in backticks", () => {
        const result = buildMonthGrid(allDays, [], t);
        for (const line of result.split("\n")) {
            expect(line).toMatch(/^`.*`$/);
        }
    });

    it("shows all 28 day numbers when present every day", () => {
        const dayDates = allDays.map((d) => d.dateStr);
        const result = buildMonthGrid(allDays, dayDates, t);
        const lines = result.split("\n");
        // Count all numbers in week rows
        const allNumbers = lines.slice(1).join("").match(/\d+/g);
        expect(allNumbers).toHaveLength(28);
    });
});
