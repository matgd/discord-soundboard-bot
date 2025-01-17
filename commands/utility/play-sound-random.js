const { SlashCommandBuilder } = require("discord.js");
const { playSoundAndReply } = require("../../utils");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("randomplay")
    .setDescription("Play random sound.")
    .setDescriptionLocalizations({
      pl: "Odtwórz losowo jeden z dostępnych dźwięków.",
    }),
  async execute(interaction) {
    const soundsIds = interaction.client.soundsIds;
    const randomSoundId =
      soundsIds[Math.floor(Math.random() * soundsIds.length)];
    await playSoundAndReply(
      interaction,
      randomSoundId,
      `:game_die: **Playing:** ${randomSoundId}`,
      10_000,
    );
  },
};
