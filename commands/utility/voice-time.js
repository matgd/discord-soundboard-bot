const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getVoiceTimeLeaderboard, formatDuration } = require("../../utils/voiceTime");
const { getRankMedal } = require("../../utils/utils");
const strings = require("../../localization/strings");

const PERIOD_CHOICES = [
    { name: "Today (since 4 AM)", name_localizations: { pl: "Dzisiaj (od 4 rano)" }, value: 0 },
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
        .setName("voice-time")
        .setDescription(strings.en.VOICE_TIME_DESCRIPTION)
        .setDescriptionLocalizations({ pl: strings.pl.VOICE_TIME_DESCRIPTION })
        .addIntegerOption((option) =>
            option
                .setName("period")
                .setDescription(strings.en.VOICE_TIME_PERIOD_DESCRIPTION)
                .setDescriptionLocalizations({ pl: strings.pl.VOICE_TIME_PERIOD_DESCRIPTION })
                .setRequired(false)
                .addChoices(...PERIOD_CHOICES),
        ),
    async execute(interaction) {
        const days = interaction.options.getInteger("period") ?? 7;
        const lang = interaction.locale?.startsWith("pl") ? "pl" : "en";
        const t = strings[lang];

        const leaderboard = getVoiceTimeLeaderboard(interaction.guildId, days);

        if (leaderboard.size === 0) {
            return interaction.reply({
                content: t.VOICE_TIME_NO_DATA,
                flags: [MessageFlags.Ephemeral],
            });
        }

        // Sort by duration descending
        const sorted = [...leaderboard.entries()].sort((a, b) => b[1] - a[1]);

        const lines = [];
        for (let i = 0; i < sorted.length; i++) {
            const [userId, duration] = sorted[i];
            lines.push(`${getRankMedal(i)} <@${userId}> — ${formatDuration(duration)}`);
        }

        const title = days === 0
            ? t.VOICE_TIME_TITLE_TODAY
            : strings.interpolate(t.VOICE_TIME_TITLE, { days });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(lines.join("\n"))
            .setColor(0x5865f2)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral],
        });
    },
};
