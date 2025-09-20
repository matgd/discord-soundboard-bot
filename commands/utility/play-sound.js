const { SlashCommandBuilder } = require("discord.js");
const { playSoundAndReply } = require("../../utils");
const { defaultAutocomplete } = require("../../utils/autocomplete");

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
        await defaultAutocomplete(interaction);
    },
    async execute(interaction) {
        let soundNameId = interaction.options.getString("identifier") ?? "No identifier provided.";
        await playSoundAndReply(interaction, soundNameId);
    },
};
