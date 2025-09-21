const { SlashCommandBuilder } = require("discord.js");
const { playSoundAndReply } = require("../../utils");
const { defaultAutocomplete } = require("../../utils/autocomplete");
const { en, pl } = require("../../localization/strings");

const CMD_NAME = "play";

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName(CMD_NAME)
        .setDescription(en.PLAY_ONE_OF_AVAILABLE_SOUNDS)
        .setDescriptionLocalizations({
            pl: pl.PLAY_ONE_OF_AVAILABLE_SOUNDS,
        })
        .addStringOption((option) =>
            option
                .setName(en.IDENTIFIER)
                .setNameLocalizations({
                    pl: pl.IDENTIFIER,
                })
                .setDescription(en.IDENTIFIER_DESCRIPTION)
                .setDescriptionLocalizations({
                    pl: pl.IDENTIFIER_DESCRIPTION,
                })
                .setRequired(true)
                .setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        await defaultAutocomplete(interaction);
    },
    async execute(interaction) {
        let soundNameId = interaction.options.getString(en.IDENTIFIER) ?? "No identifier provided.";
        await playSoundAndReply(interaction, soundNameId);
    },
};
