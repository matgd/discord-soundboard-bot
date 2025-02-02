const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require("@discordjs/voice");
const { execute } = require("./join"); // Adjust the path as needed

jest.mock("@discordjs/voice", () => ({
    joinVoiceChannel: jest.fn(),
    getVoiceConnection: jest.fn(),
    VoiceConnectionStatus: {
        Ready: "ready",
        Connecting: "connecting",
    },
}));

describe("join command", () => {
    let interaction;

    beforeEach(() => {
        interaction = {
            member: {
                voice: {
                    channel: {
                        id: "voice-channel-id",
                        guild: {
                            id: "guild-id",
                            voiceAdapterCreator: jest.fn(),
                        },
                        name: "General Voice",
                    },
                },
            },
            reply: jest.fn().mockResolvedValue(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should reply with an error if the user is not in a voice channel", async () => {
        interaction.member.voice.channel = null; // Simulate user not in a voice channel

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "You need to be in a voice channel to use this command!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });

    it("should reply with an error if the bot is already connected to a voice channel", async () => {
        const mockConnection = {
            state: {
                status: VoiceConnectionStatus.Ready,
            },
        };
        getVoiceConnection.mockReturnValue(mockConnection); // Simulate an active connection

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "I am already connected to a voice channel!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });

    it("should reply with an error if the bot is already connecting to a voice channel", async () => {
        const mockConnection = {
            state: {
                status: VoiceConnectionStatus.Connecting,
            },
        };
        getVoiceConnection.mockReturnValue(mockConnection); // Simulate a connecting connection

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "I am already connecting to a voice channel!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });

    it("should join the voice channel and reply with a success message if no connection exists", async () => {
        getVoiceConnection.mockReturnValue(null); // Simulate no connection

        await execute(interaction);

        expect(joinVoiceChannel).toHaveBeenCalledWith({
            channelId: "voice-channel-id",
            guildId: "guild-id",
            adapterCreator: interaction.member.voice.channel.guild.voiceAdapterCreator,
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Joined to the voice channel: General Voice",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });
});