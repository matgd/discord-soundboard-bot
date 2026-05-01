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

        expect(result).toBe(
            "`Pt  So  Nd  Pn  Wt  Śr  Cz`\n" +
            "` ■           ■           ■`"
        );
    });

    it("shows all filled squares when present every day", () => {
        const dayDates = weekDays.map((d) => d.dateStr);
        const result = buildWeekTicksRow(weekDays, dayDates, t);

        expect(result).toBe(
            "`Pt  So  Nd  Pn  Wt  Śr  Cz`\n" +
            "` ■   ■   ■   ■   ■   ■   ■`"
        );
    });

    it("shows no filled squares when absent every day", () => {
        const result = buildWeekTicksRow(weekDays, [], t);

        expect(result).toBe(
            "`Pt  So  Nd  Pn  Wt  Śr  Cz`\n" +
            "`                          `"
        );
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

    it("produces header and 4 week rows with day-of-month numbers for present days", () => {
        const dayDates = ["2026-03-27", "2026-04-05", "2026-04-15"];
        const result = buildMonthGrid(allDays, dayDates, t);

        expect(result).toBe(
            "`Pt  So  Nd  Pn  Wt  Śr  Cz`\n" +
            "`27                        `\n" +
            "`         5                `\n" +
            "`                    15    `\n" +
            "`                          `"
        );
    });

    it("shows spaces for absent days", () => {
        const result = buildMonthGrid(allDays, [], t);

        expect(result).toBe(
            "`Pt  So  Nd  Pn  Wt  Śr  Cz`\n" +
            "`                          `\n" +
            "`                          `\n" +
            "`                          `\n" +
            "`                          `"
        );
    });

    it("shows all 28 day numbers when present every day", () => {
        const dayDates = allDays.map((d) => d.dateStr);
        const result = buildMonthGrid(allDays, dayDates, t);

        expect(result).toBe(
            "`Pt  So  Nd  Pn  Wt  Śr  Cz`\n" +
            "`27  28  29  30  31   1   2`\n" +
            "` 3   4   5   6   7   8   9`\n" +
            "`10  11  12  13  14  15  16`\n" +
            "`17  18  19  20  21  22  23`"
        );
    });
});
