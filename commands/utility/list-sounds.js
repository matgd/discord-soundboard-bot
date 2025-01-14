const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('list')
		.setDescription('List available sounds.')
    	.setDescriptionLocalizations({
            pl: 'Wyświetla dostępne dźwięki.',
        }),
	async execute(interaction) {
		await interaction.reply('(Would list sounds here.)');
	},
};

