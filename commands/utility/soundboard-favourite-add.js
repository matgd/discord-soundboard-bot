const { SlashCommandBuilder } = require("discord.js");
const { defaultAutocomplete } = require("../../utils/autocomplete");
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../../dataStore/saved-data.json");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("fav-add")
        .setDescription("Dodaj dźwięk do ulubionych.")
        .addStringOption((option) =>
            option
                .setName("identifier")
                .setDescription("Nazwa identyfikatora dźwięku.")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("index")
                .setDescription("Pozycja na liście ulubionych (1 = początek, domyślnie na końcu)")
                .setRequired(false),
        ),
    async autocomplete(interaction) {
        await defaultAutocomplete(interaction);
    },
    async execute(interaction) {
        const userId = interaction.user.id;
        const soundId = interaction.options.getString("identifier");
        const indexOption = interaction.options.getInteger("index");
        let savedData = {};
        try {
            savedData = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
        } catch (e) {
            savedData = {};
        }
        if (!savedData[userId]) savedData[userId] = {};
        if (!Array.isArray(savedData[userId]["soundboard-favourites"])) {
            savedData[userId]["soundboard-favourites"] = [];
        }
        const favourites = savedData[userId]["soundboard-favourites"];
        if (favourites.includes(soundId)) {
            await interaction.reply({ content: `**${soundId}** jest już w ulubionych.`, ephemeral: true });
            return;
        }
        let insertIndex = favourites.length;
        if (indexOption && Number.isInteger(indexOption) && indexOption > 0) {
            insertIndex = Math.min(indexOption - 1, favourites.length);
        }
        favourites.splice(insertIndex, 0, soundId);
        fs.writeFileSync(DATA_PATH, JSON.stringify(savedData, null, 2));
        await interaction.reply({ content: `Dodano **${soundId}** do ulubionych na pozycji ${insertIndex + 1}!`, ephemeral: true });
    },
};
