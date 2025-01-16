const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const MAX_CHAR_LIMIT = 2000;
const CMD_NAME = 'list';

module.exports = {
    cooldown: 5,
	data: new SlashCommandBuilder()
		.setName(CMD_NAME)
		.setDescription('List available sounds.')
    	.setDescriptionLocalizations({
            pl: 'Wyświetla dostępne dźwięki.',
        }),
	async execute(interaction) {
        const soundsIds = interaction.client.soundsIds;
        const soundsIdsGroups = {};

        for (sId of soundsIds) {
            const firstCh = sId.at(0)
            if (!(firstCh in soundsIdsGroups)) {
                soundsIdsGroups[firstCh] = [];
            }
            soundsIdsGroups[firstCh].push(sId);
        }

        let reply = `**Available sounds (${soundsIds.length}):**`;
        // iterate over keys
        for (k of Object.keys(soundsIdsGroups)) {
            const soundsKeys = soundsIdsGroups[k].map(sId => `\`${sId}\``);
            reply += `\n**${k.toUpperCase()}**\n${soundsKeys.join(', ')}`;
        }

        if (reply.length > MAX_CHAR_LIMIT) {
            console.log(`[WARNING] The \\${CMD_NAME} command reply is too long: ${reply.length} > ${MAX_CHAR_LIMIT} characters.`);
            reply = reply.substring(0, MAX_CHAR_LIMIT - 3) + '...';
        }

        await interaction.reply({
            content: reply,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
	},
};

