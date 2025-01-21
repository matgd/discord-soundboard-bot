const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require("@discordjs/voice");

module.exports = {
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Make bot join to the voice channel you are in.")
        .setDescriptionLocalizations({
            pl: "Zaprasza bota do kanału głosowego, w którym się znajdujesz.",
        }),
    async execute(interaction) {
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return await interaction.reply({
                content: "You need to be in a voice channel to use this command!",
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        }

        const connection = getVoiceConnection(channel.guild.id);
        if (connection) {
            if (connection.state.status === VoiceConnectionStatus.Ready) {
                return await interaction.reply({
                    content: "I am already connected to a voice channel!",
                    flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
                });
            }
            if (connection.state.status === VoiceConnectionStatus.Connecting) {
                return await interaction.reply({
                    content: "I am already connecting to a voice channel!",
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
            content: `Joined to the voice channel: ${channel.name}`,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    },
};
