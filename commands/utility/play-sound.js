const { SlashCommandBuilder } = require("discord.js");
const { playSoundAndReply } = require("../../utils");

const AUTOCOMPLETE_CHOICE_LIMIT = 25; // Limit to 25 choices as per docs

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play one of available sounds.")
        .setDescriptionLocalizations({
            pl: "Odtwórz jeden z dostępnych dźwięków.",
        })
        .addStringOption((option) =>
            option
                .setName("identifier")
                .setDescription("Name identifier of sound.")
                .setDescriptionLocalizations({
                    pl: "Identyfikator nazwy dźwięku.",
                })
                .setRequired(true)
                .setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = interaction.client.soundsIds;

        let filtered = choices.filter((choice) => choice.startsWith(focusedValue));
        filtered = filtered.slice(0, AUTOCOMPLETE_CHOICE_LIMIT);
        await interaction.respond(
            filtered.map((choice) => ({
                name: choice,
                value: choice,
            })),
        );
    },
    async execute(interaction) {
        let soundNameId = interaction.options.getString("identifier") ?? "No identifier provided.";
        await playSoundAndReply(interaction, soundNameId);
    },
};
