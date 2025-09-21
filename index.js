const { Client, Events, GatewayIntentBits, MessageFlags } = require("discord.js");
const { token } = require("./config.json");
const { disconnectBotFromVoiceChannel, humanCountInVoiceChannel, ensureDataStoreExists, loadCommands, loadSoundIds } = require("./utils");
const { ActivityType } = require("discord.js");

ensureDataStoreExists();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
});

client.commands = loadCommands();

const { sounds, soundsIds } = loadSoundIds();
client.sounds = sounds;
client.soundsIds = soundsIds;

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

// Auto-disconnect from voice channel if the last member leaves
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const channel = oldState.channel;
        if (!channel) return;

        // Check if the bot is in this channel
        const botMember = channel.members.get(client.user.id);
        if (!botMember) return;

        if (humanCountInVoiceChannel(channel) === 0) {
            disconnectBotFromVoiceChannel(channel);
        }
    }
});


// Log in to Discord with your client's token
client.login(token);
