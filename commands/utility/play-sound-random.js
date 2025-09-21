const { SlashCommandBuilder } = require("discord.js");
const { playSoundAndReply } = require("../../utils");
const { pl, en } = require("../../localization/strings");

const CMD_NAME = "randomplay";
const DELETE_REPLY_AFTER_MS = 10_000;

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName(CMD_NAME)
        .setDescription(en.PLAY_RANDOM_SOUND)
        .setDescriptionLocalizations({
            pl: pl.PLAY_RANDOM_SOUND,
        }),
    async execute(interaction) {
        const soundsIds = interaction.client.soundsIds;
        const randomSoundId = soundsIds[Math.floor(Math.random() * soundsIds.length)];
        await playSoundAndReply(interaction, randomSoundId, `:game_die: **Playing:** ${randomSoundId}`, DELETE_REPLY_AFTER_MS);
    },
};
