const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { en, pl } = require("../../localization/strings");

const CMD_NAME = "disc";

module.exports = {
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName(CMD_NAME)
        .setDescription(en.DISCONNECT_BOT_FROM_THE_VOICE_CHANNEL)
        .setDescriptionLocalizations({
            pl: pl.DISCONNECT_BOT_FROM_THE_VOICE_CHANNEL,
        }),
    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            return await interaction.reply({
                content: pl.IM_NOT_CONNECTED_TO_A_VOICE_CHANNEL,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        }
        connection.destroy();
        return await interaction.reply({
            content: pl.BYE,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    },
};
