const {
    SlashCommandBuilder,
    MessageFlags,
    ComponentType,
} = require("discord.js");
const { playSoundAndReply } = require("../../utils");
const { getSoundboard, MAX_BUTTONS } = require("../../utils/soundboard");
const { pl, en, interpolate } = require("../../localization/strings");

CMD_NAME = "soundboard-search"

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName(CMD_NAME)
        .setDescription(en.GET_SOUNDBOARD_FILTERED_BY_MATCHING_TEXT)
        .setDescriptionLocalizations({
            pl: pl.GET_SOUNDBOARD_FILTERED_BY_MATCHING_TEXT,
        })
        .addStringOption((option) =>
            option.setName(en.QUERY).setDescription(en.QUERY_DESCRIPTION).setDescriptionLocalizations({
                pl: pl.QUERY_DESCRIPTION,
            })
            .setRequired(true)
        ),
    async execute(interaction) {
        let query = interaction.options.getString(en.QUERY) ?? "";

        const filteredSoundIds = interaction.client.soundsIds.filter((soundId) =>
            soundId.toLowerCase().includes(query.toLowerCase())
        );
        const soundboard = getSoundboard(filteredSoundIds, 1);
        if (!soundboard.length) {
            await interaction.reply({
                content: pl.NO_SOUNDS_MATCHING_YOUR_QUERY,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
            return;
        }

        const showingN = filteredSoundIds.length > MAX_BUTTONS ? MAX_BUTTONS : filteredSoundIds.length;
        const buttonReply = await interaction.reply({
            content: interpolate(pl.SHOWING_N_OF_FOUND_SOUNDS_FOR_QUERY, { n: showingN, found: filteredSoundIds.length, query }),
            components: soundboard,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });

        const collector = buttonReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
        });

        collector.on("collect", async (buttonInteraction) => {
            await playSoundAndReply(buttonInteraction, buttonInteraction.customId, "", 500);
        });
    },
};
