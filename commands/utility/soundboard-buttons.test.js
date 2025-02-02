const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageFlags,
    ComponentType,
} = require("discord.js");
const { playSoundAndReply } = require("../../utils");
const { execute } = require("./soundboard-buttons");

jest.mock("../../utils", () => ({
    playSoundAndReply: jest.fn(),
}));

describe("soundboard command", () => {
    let interaction;

    beforeEach(() => {
        interaction = {
            options: {
                getInteger: jest.fn().mockReturnValue(1),
            },
            client: {
                soundsIds: Array.from({ length: 30 }, (_, i) => `sound${i + 1}`),
            },
            reply: jest.fn().mockResolvedValue({
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn(),
                }),
            }),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should display buttons for the first page if no page is specified", async () => {
        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Page: 1/2",
            components: expect.any(Array),
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });

        const rows = interaction.reply.mock.calls[0][0].components;
        expect(rows.length).toBe(5); // 25 buttons split into 5 rows of 5 buttons each
        expect(rows[0].components.length).toBe(5);
    });

    it("should display buttons for the specified page", async () => {
        interaction.options.getInteger.mockReturnValue(2);

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Page: 2/2",
            components: expect.any(Array),
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });

        const rows = interaction.reply.mock.calls[0][0].components;
        expect(rows.length).toBe(1); // Only 5 buttons left for the second page
        expect(rows[0].components.length).toBe(5);
    });

    it("should handle an invalid page by showing an error message", async () => {
        interaction.options.getInteger.mockReturnValue(3); // Page 3 doesn't exist

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "No sounds on page 3. Total pages: 2",
            flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications],
        });
    });

    it("should set up a button collector and call playSoundAndReply when a button is clicked", async () => {
        const mockCollector = {
            on: jest.fn(),
        };
        interaction.reply.mockResolvedValue({
            createMessageComponentCollector: jest.fn().mockReturnValue(mockCollector),
        });

        await execute(interaction);

        expect(mockCollector.on).toHaveBeenCalledWith("collect", expect.any(Function));

        const buttonInteraction = {
            customId: "sound1",
            deferUpdate: jest.fn(),
        };
        mockCollector.on.mock.calls[0][1](buttonInteraction);

        expect(playSoundAndReply).toHaveBeenCalledWith(buttonInteraction, "sound1", "", 500);
    });
});