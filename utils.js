const { MessageFlags } = require("discord.js");
const { createAudioPlayer, createAudioResource, getVoiceConnection } = require("@discordjs/voice");

/**
 * Replaces Polish diacritic characters in a string with their ASCII equivalents.
 * @param {string} str - The input string possibly containing Polish characters.
 * @returns {string} The string with Polish characters replaced by ASCII equivalents.
 */
function replacePolishChars(str) {
    const charMap = {
        ą: "a",
        ć: "c",
        ę: "e",
        ł: "l",
        ń: "n",
        ó: "o",
        ś: "s",
        ź: "z",
        ż: "z",
    };

    return str.replace(/[ąćęłńóśźż]/g, function (match) {
        return charMap[match];
    });
}

/**
 * Converts a file basename to a normalized ID by replacing Polish characters, removing non-alphanumeric characters, and lowercasing.
 * @param {string} basename - The file basename to convert.
 * @returns {string} The normalized ID.
 */
function basenameToId(basename) {
    let modifiedBasename = replacePolishChars(basename);
    modifiedBasename = modifiedBasename.replace(/[^a-zA-Z0-9]/g, " ");
    modifiedBasename = modifiedBasename.replace("  ", ") ");
    return modifiedBasename.toLowerCase();
}

/**
 * Plays a sound in the user's voice channel and replies to the interaction.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 * @param {string} soundId - The ID of the sound to play.
 * @param {string} [successMsg=""] - Optional success message to reply with.
 * @param {number} [deleteReplyTime=3000] - Time in ms to delete the reply after, or <=0 to not delete.
 * @returns {Promise<void>}
 */
async function playSoundAndReply(interaction, soundId, successMsg = "", deleteReplyTime = 3_000) {
    // deleteReplyTime <= 0 means don't delete the reply

    let connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
        await interaction.reply({
            content: "I am not connected to a voice channel!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
        return;
    }

    const matchingPaths = interaction.client.soundsIds.filter((s) => s.startsWith(soundId));
    const foundSoundId = matchingPaths[0];
    const successMessage = successMsg || `**Playing:** ${foundSoundId}`;

    if (!foundSoundId) {
        await interaction.reply({
            content: "*Sound not found.*",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
        return;
    }
    const soundPath = interaction.client.sounds.get(foundSoundId);

    const player = createAudioPlayer();
    connection.subscribe(player);
    const resource = createAudioResource(soundPath);
    player.play(resource);

    await interaction.reply({
        content: successMessage,
        flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
    });

    if (deleteReplyTime > 0) setTimeout(() => interaction.deleteReply(), deleteReplyTime);
}

/**
 * Disconnects the bot from a voice channel in the specified channel's guild.
 * @param {import('discord.js').VoiceChannel} channel - The voice channel object.
 */
function disconnectBotFromVoiceChannel(channel) {
    try {
        const { getVoiceConnection } = require('@discordjs/voice');
        const connection = getVoiceConnection(channel.guild.id);
        if (connection) connection.destroy();
    } catch (err) {
        console.error("Failed to disconnect voice connection:", err);
    }
}

/**
 * Returns the number of non-bot (human) members in a voice channel.
 * @param {import('discord.js').VoiceChannel} channel
 * @returns {number}
 */
function humanCountInVoiceChannel(channel) {
    return channel.members.filter(member => !member.user.bot).size;
}

module.exports = {
    basenameToId,
    playSoundAndReply,
    disconnectBotFromVoiceChannel,
    humanCountInVoiceChannel,
};
