const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getDaysPresentLeaderboard, DAY_SHIFT_MS } = require("../../utils/voiceTime");
const { getRankMedal } = require("../../utils/utils");
const strings = require("../../localization/strings");

const PERIOD_CHOICES = [
    { name: "Last 7 days", name_localizations: { pl: "Ostatnie 7 dni" }, value: 7 },
    { name: "Last 14 days", name_localizations: { pl: "Ostatnie 14 dni" }, value: 14 },
    { name: "Last 28 days", name_localizations: { pl: "Ostatnie 28 dni" }, value: 28 },
    { name: "Last 60 days", name_localizations: { pl: "Ostatnie 60 dni" }, value: 60 },
    { name: "Last 90 days", name_localizations: { pl: "Ostatnie 90 dni" }, value: 90 },
    { name: "Last 180 days", name_localizations: { pl: "Ostatnie 180 dni" }, value: 180 },
    { name: "Last 365 days", name_localizations: { pl: "Ostatnie 365 dni" }, value: 365 },
];

function getLastNDays(n) {
    const shiftedNow = new Date(Date.now() - DAY_SHIFT_MS);
    const days = [];
    for (let d = n - 1; d >= 0; d--) {
        const date = new Date(shiftedNow.getTime() - d * 24 * 60 * 60 * 1000);
        days.push({
            dateStr: date.toISOString().slice(0, 10),
            dayOfWeek: date.getUTCDay(),
            dayOfMonth: date.getUTCDate(),
        });
    }
    return days;
}

function getLastSevenDays() {
    return getLastNDays(7);
}

function buildWeekTicksRow(weekDays, dayDates, t) {
    const dateSet = new Set(dayDates);
    const header = weekDays.map((d) => t.DAY_SHORT[d.dayOfWeek].padStart(2)).join("  ");
    const ticks = weekDays.map((d) => (dateSet.has(d.dateStr) ? " ■" : "  ")).join("  ");
    return `\`${header}\`\n\`${ticks}\``;
}

function buildMonthGrid(allDays, dayDates, t) {
    const dateSet = new Set(dayDates);
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7));
    }
    const header = weeks[0].map((d) => t.DAY_SHORT[d.dayOfWeek].padStart(2)).join("  ");
    const rows = weeks.map((week) =>
        week.map((d) => (dateSet.has(d.dateStr) ? String(d.dayOfMonth).padStart(2) : "  ")).join("  "),
    );
    return `\`${header}\`\n${rows.map((r) => `\`${r}\``).join("\n")}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("days-present-count")
        .setDescription(strings.en.DAYS_PRESENT_DESCRIPTION)
        .setDescriptionLocalizations({ pl: strings.pl.DAYS_PRESENT_DESCRIPTION })
        .addIntegerOption((option) =>
            option
                .setName("period")
                .setDescription(strings.en.DAYS_PRESENT_PERIOD_DESCRIPTION)
                .setDescriptionLocalizations({ pl: strings.pl.DAYS_PRESENT_PERIOD_DESCRIPTION })
                .setRequired(false)
                .addChoices(...PERIOD_CHOICES),
        ),
    async execute(interaction) {
        const days = interaction.options.getInteger("period") || 7;
        const lang = interaction.locale?.startsWith("pl") ? "pl" : "en";
        const t = strings[lang];

        const leaderboard = getDaysPresentLeaderboard(interaction.guildId, days);

        if (leaderboard.size === 0) {
            return interaction.reply({
                content: t.DAYS_PRESENT_NO_DATA,
                flags: [MessageFlags.Ephemeral],
            });
        }

        // Sort by day count descending
        const sorted = [...leaderboard.entries()].sort((a, b) => b[1].length - a[1].length);

        const showWeek = days <= 7;
        const showMonth = days === 28;
        const weekDays = showWeek ? getLastSevenDays() : [];
        const monthDays = showMonth ? getLastNDays(28) : [];

        const lines = [];
        for (let i = 0; i < sorted.length; i++) {
            const [userId, dayDates] = sorted[i];
            let line = `${getRankMedal(i)} <@${userId}> — ${dayDates.length}`;
            if (showWeek) {
                line += `\n${buildWeekTicksRow(weekDays, dayDates, t)}`;
            } else if (showMonth) {
                line += `\n${buildMonthGrid(monthDays, dayDates, t)}`;
            }
            lines.push(line);
        }

        const embed = new EmbedBuilder()
            .setTitle(strings.interpolate(t.DAYS_PRESENT_TITLE, { days }))
            .setDescription(lines.join("\n"))
            .setColor(0x5865f2)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral],
        });
    },
    buildWeekTicksRow,
    buildMonthGrid,
    getLastNDays,
    getLastSevenDays,
};
