const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require("@discordjs/voice");
const { en, pl, interpolate } = require("../../localization/strings");

const CMD_NAME = "join";

module.exports = {
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName(CMD_NAME)
        .setDescription(en.MAKE_BOT_JOIN_TO_THE_VOICE_CHANNEL_YOU_ARE_IN)
        .setDescriptionLocalizations({
            pl: pl.MAKE_BOT_JOIN_TO_THE_VOICE_CHANNEL_YOU_ARE_IN,
        }),
    async execute(interaction) {
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return await interaction.reply({
                content: pl.YOU_NEED_TO_BE_IN_A_VOICE_CHANNEL_TO_USE_THIS_COMMAND,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        }

        const connection = getVoiceConnection(channel.guild.id);
        if (connection) {
            if (connection.state.status === VoiceConnectionStatus.Ready) {
                return await interaction.reply({
                    content: pl.I_AM_ALREADY_CONNECTED_TO_A_VOICE_CHANNEL,
                    flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
                });
            }
            if (connection.state.status === VoiceConnectionStatus.Connecting) {
                return await interaction.reply({
                    content: pl.I_AM_ALREADY_CONNECTING_TO_A_VOICE_CHANNEL,
                    flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
                });
            }
        }
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        await interaction.reply({
            content: interpolate(pl.JOINED_TO_THE_VOICE_CHANNEL_XYZ, { channel: channel.name }),
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    },
};
