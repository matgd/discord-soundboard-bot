const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { loadSoundIds } = require('../../utils');
const { en, pl, interpolate } = require("../../localization/strings");

const CMD_NAME = 'refresh-sound-ids';

module.exports = {
    cooldown: 60,
    data: new SlashCommandBuilder()
        .setName(CMD_NAME)
        .setDescription(en.REFRESH_SOUND_IDS)
        .setDescriptionLocalizations({
            pl: pl.REFRESH_SOUND_IDS,
        }),
    async execute(interaction) {
        try {
            const { sounds, soundsIds } = loadSoundIds();
            // Update the client's sound data
            interaction.client.sounds = sounds;
            interaction.client.soundsIds = soundsIds;
            
            await interaction.reply({ 
                content: interpolate(pl.SOUND_IDS_REFRESHED_LOADED_N_SOUNDS, { n: soundsIds.length }), 
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications]
            });
        } catch (error) {
            console.error('Error refreshing sound IDs:', error);
            await interaction.reply({
                content: pl.FAILED_TO_REFRESH_SOUND_IDS,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        }
    },
};