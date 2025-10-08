const {
    SlashCommandBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getSoundboard } = require("../../utils/soundboard");

const MAX_BUTTONS = 25;
const DATA_PATH = path.join(__dirname, "../../dataStore/saved-data.json");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("fav-delete")
        .setDescription("Usuń dźwięk z ulubionych poprzez wybór przyciskiem.")
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
        const soundboard = getSoundboard(favourites, page, () => ButtonStyle.Danger);
        if (!soundboard.length) {
            await interaction.reply({
                content: `Brak ulubionych dźwięków na stronie ${page}. Liczba stron: ${maxPage}`,
                flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
            });
            return;
        }

        const buttonReply = await interaction.reply({
            content: `**Usuń** ulubiony dźwięk - Strona: ${page}/${maxPage}`,
            components: soundboard,
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
        const collector = buttonReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
        });
        collector.on("collect", async (buttonInteraction) => {
            const toDelete = buttonInteraction.customId;
            const idx = favourites.indexOf(toDelete);
            if (idx !== -1) {
                favourites.splice(idx, 1);
                savedData[userId]["soundboard-favourites"] = favourites;
                fs.writeFileSync(DATA_PATH, JSON.stringify(savedData, null, 2));
                await buttonInteraction.reply({ content: `Usunięto **${toDelete}** z ulubionych.`, flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications] });
            } else {
                await buttonInteraction.reply({ content: `Nie znaleziono dźwięku **${toDelete}** w ulubionych.`, flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications] });
            }
        });
    },
};
