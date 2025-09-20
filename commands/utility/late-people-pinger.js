const { SlashCommandBuilder } = require('discord.js');
const { en, pl } = require('../localization/strings');

const LATE_GIF = "./images/najman_spoznion.gif"; // Path to the GIF file
const CMD_NAME = 'najman';

/**
 * Returns a message indicating the tactical najman is set for a channel and time.
 * @param {string} channelName
 * @param {string} time
 * @returns {string}
 */
function getTimeSetMessage(channelName, time) {
    const formattedTime = time === 'teraz' ? 'teraz' : `na dzisiaj ${time}`;
    return `Taktyczny najman ustawiony ${formattedTime}. Będę monitorować kanał głosowy ${channelName}.`;
}

/**
 * Extracts user IDs from a string containing Discord user mentions.
 *
 * @param {string} usersInput - The input string containing Discord user mentions (e.g., "<@1234567890> <@!0987654321>").
 * @returns {string[]} An array of extracted user IDs as strings. Returns an empty array if no mentions are found.
 */
function getUserIds(usersInput) {
    return usersInput.match(/<@!?\d+>/g)?.map(mention => mention.replace(/<@!?(\d+)>/, '$1')) || [];
}

/**
 * Represents the result of converting a provided time string.
 * Contains the delay in milliseconds and an optional error message.
 * */
class TimeConvertResult {
    /**
     * @param {number|null} delay
     * @param {string|null} errorMsg
     */
    constructor(delay, errorMsg) {
        this.delay = delay;
        this.errorMsg = errorMsg;
    }
}

/**
 * Converts a provided time string to a delay in milliseconds from now.
 * @param {string} time - The time string in format 'HH:MM' or 'teraz'.
 * @returns {TimeConvertResult}
 */
function convertProvidedTime(time) {
    if (time.toLowerCase() === 'teraz') {
        return new TimeConvertResult(0, null);
    }
    const [hour, minute] = time.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hour, minute, 0, 0);
    if (isNaN(targetTime.getTime())) {
        return new TimeConvertResult(null, 'Byczq, niepoprawny format godziny. Użyj HH:MM lub "teraz".');
    }
    const now = new Date();
    let delay = targetTime - now;
    delay += 60 * 1000; // add 1 minute
    if (delay < 0) {
        return new TimeConvertResult(null, 'Typie, spójrz w zegarek. To już minęło.');
    }
    return new TimeConvertResult(delay, null);
}

module.exports = {
    cooldown: 5, // Optional: Set a cooldown for the command
    data: new SlashCommandBuilder()
        .setName(CMD_NAME) // Command name
        .setDescription(en.WE_ARE_SCHEDULED) // Command description
        .setDescriptionLocalizations({
            pl: pl.WE_ARE_SCHEDULED
        })
        .addStringOption(option =>
            option.setName('godzina')
                .setDescription('Godzina dzisiaj w formacie HH:MM lub "teraz"')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('uczestnicy')
                .setDescription('Kto ma się wstawić w formacie @user1 @user2...')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanał')
                .setDescription('Kanał głosowy do monitorowania')
                .setRequired(true)), // Only voice channels are allowed
    async execute(interaction) {
        // Extract options from the interaction
        const time = interaction.options.getString('godzina');
        const usersInput = interaction.options.getString('uczestnicy');
        const channel = interaction.options.getChannel('kanał');

        // Validate the channel type (must be a voice channel)
        if (!channel.isVoiceBased()) {
            return interaction.reply('Proszę podać prawidłowy kanał głosowy.');
        }

        // Extract user IDs from mentions
        const userIds = getUserIds(usersInput);
        if (userIds.length === 0) {
            return interaction.reply('Nie podano prawidłowych użytkowników. Użyj @mention.');
        }

        // Convert provided time
        const timeResult = convertProvidedTime(time);
        if (timeResult.errorMsg) {
            return interaction.reply(timeResult.errorMsg);
        }

        // Acknowledge the command and set a timeout
        await interaction.reply(getTimeSetMessage(channel.name, time));

        setTimeout(async () => {
            // Fetch all members in the guild to ensure voice states are up-to-date
            await interaction.guild.members.fetch();

            // Check which users are late (not in the specified voice channel)
            const lateUsers = userIds.filter(userId => {
                const member = interaction.guild.members.cache.get(userId);
                return !member || !member.voice || member.voice.channelId !== channel.id;
            });

            // If nobody is late
            if (lateUsers.length === 0) {
                return interaction.channel.send('Wszyscy są na czas! Brawo! 🎉');
            }

            // Ping late users
            const lateMentions = lateUsers.map(userId => `<@${userId}>`).join(' ');
            interaction.channel.send({
                content: `${lateMentions} spóźnion!`,
                files: [LATE_GIF], // Attach the GIF file
            });
        }, delay); // delay is 0 for "teraz"
    },
    // Export functions for testing
    getTimeSetMessage,
    getUserIds,
    convertProvidedTime,
    TimeConvertResult,
};
