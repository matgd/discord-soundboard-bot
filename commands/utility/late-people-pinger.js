const { SlashCommandBuilder } = require('discord.js');

const LATE_GIF = "./images/najman_spoznion.gif"; // Path to the GIF file

module.exports = {
    cooldown: 5, // Optional: Set a cooldown for the command
    data: new SlashCommandBuilder()
        .setName('najman') // Command name
        .setDescription('Jesteśmy umówieni...') // Command description
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
        const userIds = usersInput.match(/<@!?(\d+)>/g)?.map(mention => mention.replace(/<@!?(\d+)>/, '$1')) || [];
        if (userIds.length === 0) {
            return interaction.reply('Nie podano prawidłowych użytkowników. Użyj @mention.');
        }

        // Handle "teraz" or parse the time
        let delay = 0; // Default to 0 for "teraz"
        if (time.toLowerCase() !== 'teraz') {
            const [hour, minute] = time.split(':').map(Number);
            const targetTime = new Date();
            targetTime.setHours(hour, minute, 0, 0);

            // Validate the time
            if (isNaN(targetTime.getTime())) {
                return interaction.reply('Byczq, niepoprawny format godziny. Użyj HH:MM lub "teraz".');
            }

            const now = new Date();
            delay = targetTime - now;
            // add 1 minute
            delay += 60 * 1000;

            // Check if the time has already passed
            if (delay < 0) {
                return interaction.reply('Typie, spójrz w zegarek. To już minęło.');
            }
        }

        // Acknowledge the command and set a timeout
        await interaction.reply(`Taktyczny najman ustawiony ${time === 'teraz' ? 'teraz' : `na dzisiaj ${time}`}. Będę monitorować kanał głosowy ${channel.name}.`);

        setTimeout(async () => {
            // Fetch all members in the guild to ensure voice states are up-to-date
            await interaction.guild.members.fetch();

            // Check which users are late (not in the specified voice channel)
            const lateUsers = userIds.filter(userId => {
                const member = interaction.guild.members.cache.get(userId);
                return !member || !member.voice || member.voice.channelId !== channel.id;
            });

            // Debugging: Log late users

            // If nobody is late
            if (lateUsers.length === 0) {
                return interaction.channel.send('Wszyscy są na czas! Brawo! 🎉');
            }

            // Ping late users
            const lateMentions = lateUsers.map(userId => `<@${userId}>`).join(' ');
            const gifUrl = 'https://media1.tenor.com/m/m6iiQt-F0OoAAAAd/najman-marcin.gif';
            interaction.channel.send({
                content: `${lateMentions} spóźnion!`,
                files: [LATE_GIF], // Attach the GIF file
            });
        }, delay); // delay is 0 for "teraz"
    },
};
