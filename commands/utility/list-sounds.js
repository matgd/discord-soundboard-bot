const { SlashCommandBuilder } = require('discord.js');

const MAX_CHAR_LIMIT = 2000;
const CMD_NAME = 'list';

module.exports = {
	data: new SlashCommandBuilder()
		.setName(CMD_NAME)
		.setDescription('List available sounds.')
    	.setDescriptionLocalizations({
            pl: 'Wyświetla dostępne dźwięki.',
        }),
	async execute(interaction) {
        let soundsIds = [];
        await interaction.client.sounds.forEach((_, soundId) => {
            soundsIds.push(soundId);
        });

        let reply = `**Available sounds (${soundsIds.length}):**\n${soundsIds.join(', ')}`;
        if (reply.length > MAX_CHAR_LIMIT) {
            console.log(`[WARNING] The \\${CMD_NAME} command reply is too long: ${reply.length} > ${MAX_CHAR_LIMIT} characters.`);
            reply = reply.substring(0, MAX_CHAR_LIMIT - 3) + '...';
        }

        await interaction.reply(reply);
	},
};

