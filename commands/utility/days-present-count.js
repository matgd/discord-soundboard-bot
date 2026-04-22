const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getDaysPresentLeaderboard, DAY_SHIFT_MS } = require("../../utils/voiceTime");
const strings = require("../../localization/strings");

const PERIOD_CHOICES = [
    { name: "Last 7 days", name_localizations: { pl: "Ostatnie 7 dni" }, value: 7 },
    { name: "Last 14 days", name_localizations: { pl: "Ostatnie 14 dni" }, value: 14 },
    { name: "Last 30 days", name_localizations: { pl: "Ostatnie 30 dni" }, value: 30 },
    { name: "Last 60 days", name_localizations: { pl: "Ostatnie 60 dni" }, value: 60 },
    { name: "Last 90 days", name_localizations: { pl: "Ostatnie 90 dni" }, value: 90 },
    { name: "Last 180 days", name_localizations: { pl: "Ostatnie 180 dni" }, value: 180 },
    { name: "Last 365 days", name_localizations: { pl: "Ostatnie 365 dni" }, value: 365 },
];

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

        const lines = [];
        for (let i = 0; i < sorted.length; i++) {
            const [userId, dayDates] = sorted[i];
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
            let line = `${medal} <@${userId}> — ${dayDates.length}`;
            if (days <= 7) {
                const dayNames = dayDates
                    .map((d) => {
                        const date = new Date(new Date(d + "T00:00:00Z").getTime() + DAY_SHIFT_MS);
                        return t.DAY_NAMES[date.getUTCDay()];
                    })
                    .join(", ");
                line += `\n${dayNames}`;
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
};
