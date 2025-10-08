const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const MAX_BUTTONS = 25;
const MAX_ROWS = 5;

/**
 * Generates a soundboard with buttons for the given sound IDs.
 * @param {string[]} soundIds - Array of sound IDs to create buttons for.
 * @param {number} page - The page number to display (1-based).
 * @param {function} buttonStylePredicate - A function that takes a index and soundId, returns a ButtonStyle.
 * @returns {ActionRowBuilder<ButtonBuilder>[]} An array of ActionRowBuilders containing the buttons.
 */
function getSoundboard(soundIds, page = 1, buttonStylePredicate = () => ButtonStyle.Secondary) {
    const soundIdsToShow = soundIds.slice((page - 1) * MAX_BUTTONS, page * MAX_BUTTONS);

    // Ensure unique sound IDs for buttons otherwise it might return an error
    const uniqueSoundIds = [...new Set(soundIdsToShow)];

    const buttons = [];
    const rows = [];

    uniqueSoundIds.forEach((soundId, index) => {
        buttons.push(new ButtonBuilder()
            .setCustomId(soundId)
            .setLabel(soundId)
            .setStyle(buttonStylePredicate(index, soundId))
        );
    });

    while (buttons.length) {
        rows.push(new ActionRowBuilder().addComponents(buttons.splice(0, MAX_ROWS)));
    }

    return rows;
}

module.exports = { getSoundboard, MAX_BUTTONS };