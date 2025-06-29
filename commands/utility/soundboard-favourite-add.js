const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const AUTOCOMPLETE_CHOICE_LIMIT = 25;
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
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = interaction.client.soundsIds;
        let filtered = choices.filter((choice) => choice.startsWith(focusedValue));
        filtered = filtered.slice(0, AUTOCOMPLETE_CHOICE_LIMIT);
        await interaction.respond(
            filtered.map((choice) => ({
                name: choice,
                value: choice,
            })),
        );
    },
    async execute(interaction) {
        const userId = interaction.user.id;
        const soundId = interaction.options.getString("identifier");

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

        if (!savedData[userId]["soundboard-favourites"].includes(soundId)) {
            savedData[userId]["soundboard-favourites"].push(soundId);
            fs.writeFileSync(DATA_PATH, JSON.stringify(savedData, null, 2));
            await interaction.reply({ content: `Dodano **${soundId}** do ulubionych!`, ephemeral: true });
        } else {
            await interaction.reply({ content: `**${soundId}** jest już w ulubionych.`, ephemeral: true });
        }
    },
};
