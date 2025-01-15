const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');

const AUTOCOMPLETE_CHOICE_LIMIT = 25;  // Limit to 25 choices as per docs

module.exports = {
    cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play one of available sounds.')
    	.setDescriptionLocalizations({
            pl: 'Odtwórz jeden z dostępnych dźwięków.',
        })
        .addStringOption(option =>
                option.setName('identifier')
                    .setDescription('Name identifier of sound.')
                    .setDescriptionLocalizations({
                        pl: 'Identyfikator nazwy dźwięku.',
                    })
        			.setRequired(true)
                    .setAutocomplete(true)),
    async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
        const choices = interaction.client.soundsIds;

		let filtered = choices.filter(choice => choice.startsWith(focusedValue));
        filtered = filtered.slice(0, AUTOCOMPLETE_CHOICE_LIMIT);
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
	},
    async execute(interaction) {
        const soundNameId = interaction.options.getString('identifier') ?? 'No identifier provided.';

        let connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            await interaction.reply({
                content: 'I am not connected to a voice channel!',
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
            return;
        }

        const soundPath = interaction.client.sounds.get(soundNameId);
        if (!soundPath) {
            await interaction.reply({
                content: '*Sound not found.*',
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
            return;
        }

        const player = createAudioPlayer();
        connection.subscribe(player);
        const resource = createAudioResource(soundPath);
        player.play(resource);

        await interaction.reply({
            content: `Playing: ${soundNameId}`,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
	}
};

