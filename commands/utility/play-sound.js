const { SlashCommandBuilder } = require("discord.js");
const { playSoundAndReply } = require("../../utils");

const AUTOCOMPLETE_CHOICE_LIMIT = 25; // Limit to 25 choices as per docs

/**
 * Returns a list of autocomplete choices based on the input string.
 *
 * @param {string} input - The current user input to match against choices.
 * @param {string[]} choices - The list of available string choices.
 * @param {number} [limit=AUTOCOMPLETE_CHOICE_LIMIT] - The maximum number of choices to return.
 * @returns {{name: string, value: string}[]} An array of choice objects for Discord autocomplete.
 */
function getAutocompleteChoices(input, choices, limit = AUTOCOMPLETE_CHOICE_LIMIT) {
    const words = input.trim().split(/\s+/).filter(Boolean);
    let filteredChoices = choices;

    for (const word of words) {
        filteredChoices = filteredChoices
            .filter((choice) => choice.includes(word))
            .slice(0, limit);
        if (filteredChoices.length === 0) {
            return [];
        }
    }

    // Usually when there is no word
    if (filteredChoices.length > limit) {
        filteredChoices = filteredChoices.slice(0, limit);
    }

    return filteredChoices.map((choice) => ({
        name: choice,
        value: choice,
    }));
}

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play one of available sounds.")
        .setDescriptionLocalizations({
            pl: "Odtwórz jeden z dostępnych dźwięków.",
        })
        .addStringOption((option) =>
            option
                .setName("identifier")
                .setDescription("Name identifier of sound.")
                .setDescriptionLocalizations({
                    pl: "Identyfikator nazwy dźwięku.",
                })
                .setRequired(true)
                .setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = interaction.client.soundsIds;
        await interaction.respond(
            getAutocompleteChoices(focusedValue, choices, AUTOCOMPLETE_CHOICE_LIMIT)
        );
    },
    async execute(interaction) {
        let soundNameId = interaction.options.getString("identifier") ?? "No identifier provided.";
        await playSoundAndReply(interaction, soundNameId);
    },
    // Export the helper function for testing
    getAutocompleteChoices,
};
