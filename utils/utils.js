const { MessageFlags, Collection } = require("discord.js");
const { createAudioPlayer, createAudioResource, getVoiceConnection } = require("@discordjs/voice");
const fs = require("node:fs");
const path = require("node:path");

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
    modifiedBasename = modifiedBasename.replace(/[^a-zA-Z0-9\[\]\(\)]/g, " ");
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

/**
 * Ensures that the dataStore directory and saved-data.json file exist.
 * Creates them if they do not exist.
 */
function ensureDataStoreExists() {
    const dataStorePath = path.join(__dirname, "dataStore");
    if (!fs.existsSync(dataStorePath)) {
        fs.mkdirSync(dataStorePath);
    }
    const savedDataPath = path.join(dataStorePath, "saved-data.json");
    if (!fs.existsSync(savedDataPath)) {
        fs.writeFileSync(savedDataPath, JSON.stringify({}));
    }
}

/**
 * Loads command modules from the commands directory and returns a Collection of commands.
 * @returns {import('discord.js').Collection<string, any>} The Collection of loaded commands.
 */
function loadCommands() {
    const path = require("node:path");
    const fs = require("node:fs");
    const { Collection } = require("discord.js");
    const commands = new Collection();
    const foldersPath = path.join("commands");
    const commandFolders = fs.readdirSync(foldersPath);
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ("data" in command && "execute" in command) {
                commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
    return commands;
}

/**
 * Loads sound files from the sounds directory and returns a Collection and sorted array of sound IDs.
 * @returns {{ sounds: import('discord.js').Collection<string, string>, soundsIds: string[] }}
 */
function loadSoundIds() {
    const sounds = new Collection();
    const soundsIds = [];
    const soundsPath = path.join(__dirname, "sounds");
    const soundFiles = fs.readdirSync(soundsPath).filter((file) => file.endsWith(".mp3"));
    for (const file of soundFiles) {
        const filePath = path.join(soundsPath, file);
        const soundId = basenameToId(path.basename(filePath, ".mp3"));
        sounds.set(soundId, filePath);
        soundsIds.push(soundId);
    }
    soundsIds.sort();
    return { sounds, soundsIds };
}

module.exports = {
    basenameToId,
    playSoundAndReply,
    disconnectBotFromVoiceChannel,
    humanCountInVoiceChannel,
    ensureDataStoreExists,
    loadCommands,
    loadSoundIds,
};
