const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    cooldown: 2,
	data: new SlashCommandBuilder()
		.setName('disc')
		.setDescription('Disconnect bot from the voice channel.')
    	.setDescriptionLocalizations({
            pl: 'Rozłącza bota z kanału głosowego.',
        }),
	async execute(interaction) {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            return await interaction.reply({
                content: 'I am not connected to a voice channel!',
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
        }
        connection.destroy();
        return await interaction.reply({
            content: 'Bye!',
            flags: [MessageFlags.SuppressNotifications],
        });
	},
};


