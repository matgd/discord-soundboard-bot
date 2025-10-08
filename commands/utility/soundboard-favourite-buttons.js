const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageFlags,
    ComponentType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { playSoundAndReply } = require("../../utils");
const { getSoundboard } = require("../../utils/soundboard");

const MAX_BUTTONS = 25;
const DATA_PATH = path.join(__dirname, "../../dataStore/saved-data.json");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("favs")
        .setDescription("Pokaż przyciski do odtwarzania ulubionych dźwięków.")
        .addIntegerOption((option) =>
            option.setName("page").setDescription("Strona ulubionych dźwięków."),
        ),
    async execute(interaction) {
        const page = interaction.options.getInteger("page") ?? 1;
        const userId = interaction.user.id;
        let savedData = {};
        try {
            savedData = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
        } catch (e) {
            savedData = {};
        }
        const favourites = (savedData[userId] && Array.isArray(savedData[userId]["soundboard-favourites"]))
            ? savedData[userId]["soundboard-favourites"]
            : [];
        const maxPage = Math.max(1, Math.ceil(favourites.length / MAX_BUTTONS));
        const soundboard = getSoundboard(favourites, page);
        if (!soundboard.length && page > maxPage) {
            await interaction.reply({
                content: `Brak ulubionych dźwięków na stronie ${page}. Liczba stron: ${maxPage}`,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
            return;
        }
        const buttonReply = await interaction.reply({
            content: `Ulubione - Strona: ${page}/${maxPage}`,
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
