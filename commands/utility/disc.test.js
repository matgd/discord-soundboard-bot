const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { execute } = require("./disc"); // Adjust the path as needed

jest.mock("@discordjs/voice", () => ({
    getVoiceConnection: jest.fn(),
}));

describe("disc command", () => {
    let interaction;

    beforeEach(() => {
        interaction = {
            guildId: "12345",
            reply: jest.fn().mockResolvedValue(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should reply with an error if the bot is not connected to a voice channel", async () => {
        getVoiceConnection.mockReturnValue(null); // Simulate no connection

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "I am not connected to a voice channel!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });

    it("should disconnect the bot and reply with 'Bye!' if connected to a voice channel", async () => {
        const mockConnection = {
            destroy: jest.fn(),
        };
        getVoiceConnection.mockReturnValue(mockConnection); // Simulate an active connection

        await execute(interaction);

        expect(mockConnection.destroy).toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Bye!",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });
});