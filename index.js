const { Client, Events, GatewayIntentBits, MessageFlags } = require("discord.js");
const { token } = require("./config.json");
const { disconnectBotFromVoiceChannel, humanCountInVoiceChannel, ensureDataStoreExists, loadCommands, loadSoundIds } = require("./utils");
const { ActivityType } = require("discord.js");
const { ensureVoiceTimeFileExists, handleVoiceJoin, handleVoiceLeave, recoverActiveSessions, flushActiveSessions, closeDb } = require("./utils/voiceTime");

ensureDataStoreExists();
ensureVoiceTimeFileExists();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
});

client.commands = loadCommands();

const { sounds, soundsIds } = loadSoundIds();
client.sounds = sounds;
client.soundsIds = soundsIds;

console.log("node version:", process.version);
console.log(`Start timestamp: ${new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}`);
console.log(`Loaded ${client.commands.size} commands.`);
console.log(`Loaded ${client.sounds.size} sounds.`);

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    client.user.setActivity("klientów klubu Eksplożyn", {
        type: ActivityType.Listening,
    });
    recoverActiveSessions(readyClient);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isAutocomplete()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.autocomplete(interaction);
    } catch (error) {
        console.error(error);
    }
});

// Track voice time and auto-disconnect from voice channel if the last member leaves
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const userId = newState.id;
    const guildId = newState.guild.id;
    const isBot = newState.member?.user?.bot;

    // Track voice time for non-bot users
    if (!isBot) {
        const leftChannel = oldState.channelId && oldState.channelId !== newState.channelId;
        const joinedChannel = newState.channelId && oldState.channelId !== newState.channelId;

        if (leftChannel) {
            handleVoiceLeave(guildId, userId);
        }
        if (joinedChannel) {
            handleVoiceJoin(guildId, userId, newState.channelId);
        }
    }

    // Auto-disconnect bot when no humans remain
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const channel = oldState.channel;
        if (!channel) return;

        const botMember = channel.members.get(client.user.id);
        if (!botMember) return;

        if (humanCountInVoiceChannel(channel) === 0) {
            disconnectBotFromVoiceChannel(channel);
        }
    }
});

client.login(token);

// Graceful shutdown: flush active voice sessions so time is not lost
function gracefulShutdown(signal) {
    console.log(`Received ${signal}, flushing active voice sessions...`);
    flushActiveSessions();
    closeDb();
    process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));