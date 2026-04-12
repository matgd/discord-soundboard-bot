const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState, createAudioPlayer, createAudioResource } = require("@discordjs/voice");
const { en, pl, interpolate } = require("../../localization/strings");

const CMD_NAME = "join";

function playRandomPawelekSound(client, connection) {
    const pawelekSounds = client.soundsIds.filter(id => id.startsWith("pawelek)"));
    if (pawelekSounds.length === 0) return;

    const randomSound = pawelekSounds[Math.floor(Math.random() * pawelekSounds.length)];
    const soundPath = client.sounds.get(randomSound);
    if (!soundPath) return;

    const player = createAudioPlayer();
    const resource = createAudioResource(soundPath);
    player.on('error', error => {
        console.error(`Error playing join sound: ${error.message}`);
    });
    connection.subscribe(player);
    player.play(resource);
}

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
        const newConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        newConnection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(newConnection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(newConnection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Reconnecting to a new voice server
            } catch (error) {
                // Real disconnect — destroy the connection
                newConnection.destroy();
            }
        });
        try {
            await entersState(newConnection, VoiceConnectionStatus.Ready, 15_000);

            playRandomPawelekSound(interaction.client, newConnection);

            await interaction.reply({
                content: interpolate(pl.JOINED_TO_THE_VOICE_CHANNEL_XYZ, { channel: channel.name }),
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        } catch (error) {
            console.error("Failed to join voice channel — connection did not reach Ready state:", error);
            newConnection.destroy();
            await interaction.reply({
                content: "Failed to connect to voice channel. Try again.",
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        }
    },
};
