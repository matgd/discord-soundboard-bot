const AUTOCOMPLETE_CHOICE_LIMIT = 25; // Limit to 25 choices as per docs

/**
 * Returns a list of autocomplete choices based on the input string.
 *
 * @param {string} input - The current user input to match against choices.
 * @param {string[]} choices - The list of available string choices.
 * @param {number} [limit=25] - The maximum number of choices to return.
 * @returns {{name: string, value: string}[]} An array of choice objects for Discord autocomplete.
 */
function getChoiceByIncludedSubstring(input, choices, limit = AUTOCOMPLETE_CHOICE_LIMIT) {
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

    if (filteredChoices.length > limit) {
        filteredChoices = filteredChoices.slice(0, limit);
    }

    return filteredChoices.map((choice) => ({
        name: choice,
        value: choice,
    }));
}

async function defaultAutocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const choices = interaction.client.soundsIds;
    await interaction.respond(
        getChoiceByIncludedSubstring(focusedValue, choices)
    );
}

module.exports = { getChoiceByIncludedSubstring, defaultAutocomplete };
