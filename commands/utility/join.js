const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { 
    joinVoiceChannel, 
    getVoiceConnection, 
    VoiceConnectionStatus, 
    createAudioPlayer, 
    createAudioResource, 
    entersState 
} = require("@discordjs/voice");
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

        // 1. Inicjalizacja połączenia
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
        });

        // Informujemy użytkownika, że bot próbuje wejść
        await interaction.reply({
            content: interpolate(pl.JOINED_TO_THE_VOICE_CHANNEL_XYZ, { channel: channel.name }),
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });

        try {
            // 2. KLUCZOWY MOMENT: Czekamy max 10 sekund na stan Ready
            // Na DietPi dajemy 10s, bo procesor może mieć chwilowy skok zużycia
            await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

            // 3. Dopiero gdy połączenie jest stabilne, szukamy i puszczamy dźwięk
            const soundId = "pawelek) jestesmy na moim terenie i to ja tutaj rzadze";
            const matchingPaths = interaction.client.soundsIds.filter((s) => s.startsWith(soundId));
            const foundSoundId = matchingPaths[0];

            if (foundSoundId) {
                const soundPath = interaction.client.sounds.get(foundSoundId);
                const player = createAudioPlayer();
                
                // Obsługa błędów playera, żeby nie wywalało bota
                player.on('error', error => console.error(`Błąd odtwarzania: ${error.message}`));

                const resource = createAudioResource(soundPath);
                connection.subscribe(player);
                player.play(resource);
            }

        } catch (error) {
            console.error("Nie udało się połączyć z kanałem w wyznaczonym czasie:", error);
            // Jeśli nie udało się połączyć, niszczymy "wiszące" połączenie
            if (connection) connection.destroy();
        }
    },
};