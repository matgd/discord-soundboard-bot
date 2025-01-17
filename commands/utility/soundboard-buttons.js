const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType } = require('discord.js');
const { playSoundAndReply } = require('../../utils');

const MAX_BUTTONS = 25;


module.exports = {
    cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('soundboard')
		.setDescription('Show buttons for playing available sounds.')
    	.setDescriptionLocalizations({
            pl: 'Pokaż przyciski do odtwarzania dostępnych dźwięków.'
        })
        .addIntegerOption(option =>
                option.setName('page')
                    .setDescription('Page of soundboard.')
                    .setDescriptionLocalizations({
                        pl: 'Nr strony z dżwiękami.',
                    })),
    async execute(interaction) {
        const page = interaction.options.getInteger('page') ?? 1;
        const maxPage = Math.ceil(interaction.client.soundsIds.length/MAX_BUTTONS);

        const buttons = [];
        const showableSoounds = interaction.client.soundsIds.slice((page-1)*MAX_BUTTONS, page*MAX_BUTTONS);
        if (!showableSoounds.length) {
            await interaction.reply({
                content: `No sounds on page ${page}. Total pages: ${maxPage}`,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
            return;
        }

        showableSoounds.forEach(soundNameId => {
            buttons.push(new ButtonBuilder().
                setCustomId(soundNameId).
                setLabel(soundNameId).
                setStyle(ButtonStyle.Secondary)
            );
        })

        const rows = [];
        while (buttons.length) {
            rows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 5)));
        }

        const buttonReply = await interaction.reply({
            content: `Page: ${page}/${maxPage}`,
            components: rows,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        })

        const collector = buttonReply.createMessageComponentCollector(
            { componentType: ComponentType.Button }
        )

        collector.on('collect', async buttonInteraction => {
            await playSoundAndReply(buttonInteraction, buttonInteraction.customId, '', 500);
        });
	}
};

