const { Client, GatewayIntentBits } = require("discord.js");

const [channelId, ...messageParts] = process.argv.slice(2);
const message = messageParts.join(" ");

if (!channelId || !message) {
    console.error("Usage: node send-message.js <channel-id> <message>");
    console.error("To get a channel ID: Discord Settings → Advanced → enable Developer Mode,");
    console.error("then right-click a text channel → Copy Channel ID.");
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            console.error(`Channel ${channelId} not found or not a text channel.`);
            process.exit(1);
        }
        await channel.send(message);
        console.log(`Message sent to #${channel.name}`);
    } catch (error) {
        console.error(`Failed to send message: ${error.message}`);
        process.exit(1);
    }
    client.destroy();
});
