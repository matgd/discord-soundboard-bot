const { MessageFlags } = require("discord.js");
const { createAudioPlayer, createAudioResource, getVoiceConnection } = require("@discordjs/voice");

function replacePolishChars(str) {
    const charMap = {
        ą: "a",
        ć: "c",
        ę: "e",
        ł: "l",
        ń: "n",
        ó: "o",
        ś: "s",
        ź: "z",
        ż: "z",
    };

    return str.replace(/[ąćęłńóśźż]/g, function (match) {
        return charMap[match];
    });
}

function basenameToId(basename) {
    let modifiedBasename = replacePolishChars(basename);
    modifiedBasename = modifiedBasename.replace(/[^a-zA-Z0-9]/g, " ");
    return modifiedBasename.toLowerCase();
}

async function playSoundAndReply(interaction, soundId, successMsg = "", deleteReplyTime = 3_000) {
    // deleteReplyTime <= 0 means don't delete the reply

    let connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
        await interaction.reply({
            content: "I am not connected to a voice channel!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
        return;
    }

    const matchingPaths = interaction.client.soundsIds.filter((s) => s.startsWith(soundId));
    const foundSoundId = matchingPaths[0];
    const successMessage = successMsg || `**Playing:** ${foundSoundId}`;

    if (!foundSoundId) {
        await interaction.reply({
            content: "*Sound not found.*",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
        return;
    }
    const soundPath = interaction.client.sounds.get(foundSoundId);

    const player = createAudioPlayer();
    connection.subscribe(player);
    const resource = createAudioResource(soundPath);
    player.play(resource);

    await interaction.reply({
        content: successMessage,
        flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
    });

    if (deleteReplyTime > 0) setTimeout(() => interaction.deleteReply(), deleteReplyTime);
}

module.exports = {
    basenameToId,
    playSoundAndReply,
};
