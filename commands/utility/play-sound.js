const { SlashCommandBuilder } = require('discord.js');

const AUTOCOMPLETE_CHOICE_LIMIT = 25;  // Limit to 25 choices as per docs

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play one of available sounds.')
    	.setDescriptionLocalizations({
            pl: 'Odtwórz jeden z dostępnych dźwięków.',
        })
        .addStringOption(option =>
                option.setName('identifier')
                    .setDescription('Name identifier of sound.')
        			.setRequired(true)
                    .setAutocomplete(true)),
    async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
        const choices = interaction.client.soundsAutocomplete;

		let filtered = choices.filter(choice => choice.startsWith(focusedValue));
        filtered = filtered.slice(0, AUTOCOMPLETE_CHOICE_LIMIT);
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
	},
    async execute(interaction) {
        const soundNameId = interaction.options.getString('identifier') ?? 'No identifier provided.';
        const path = require('node:path');

        const soundPath = interaction.client.sounds.get(soundNameId);
        if (!soundPath) {
            await interaction.reply('*Sound not found.*');
            return;
        }
        await interaction.reply(`(Would play ${path.basename(soundPath)})`);
	}
};

