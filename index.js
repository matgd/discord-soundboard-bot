const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require("discord.js");
const { token } = require("./config.json");
const { basenameToId } = require("./utils");
const { ActivityType } = require("discord.js");

// Create dataStore/saved-data.json if it doesn't exist
const dataStorePath = path.join(__dirname, "dataStore");
if (!fs.existsSync(dataStorePath)) {
    fs.mkdirSync(dataStorePath);
}
const savedDataPath = path.join(dataStorePath, "saved-data.json");
if (!fs.existsSync(savedDataPath)) {
    fs.writeFileSync(savedDataPath, JSON.stringify({}));
}


const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
});

client.commands = new Collection();
client.sounds = new Collection();
client.soundsIds = [];

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const soundsPath = path.join(__dirname, "sounds");
const soundFiles = fs.readdirSync(soundsPath).filter((file) => file.endsWith(".mp3"));
for (const file of soundFiles) {
    const filePath = path.join(soundsPath, file);
    const soundId = basenameToId(path.basename(filePath, ".mp3"));
    client.sounds.set(soundId, filePath);
    client.soundsIds.push(soundId);
}

// Too lazy for Insert Sort
client.soundsIds.sort();

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

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // Auto-disconnect from voice channel if the last member leaves
        // Only check when someone leaves a voice channel
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const channel = oldState.channel;
        if (!channel) return;

        // Check if the bot is in this channel
        const botMember = channel.members.get(client.user.id);
        if (!botMember) return;

        // Count non-bot members left in the channel
        const nonBotMembers = channel.members.filter(member => !member.user.bot);
        if (nonBotMembers.size === 0) {
            // Disconnect the bot using @discordjs/voice
            try {
                const { getVoiceConnection } = require('@discordjs/voice');
                const connection = getVoiceConnection(channel.guild.id);
                if (connection) connection.destroy();
            } catch (err) {
                console.error("Failed to disconnect voice connection:", err);
            }
        }
    }
});


// Log in to Discord with your client's token
client.login(token);
