const { describe, it, expect, beforeEach } = require('@jest/globals');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const refreshSoundIdsCommand = require('../../../commands/utility/refresh-sound-ids');
const { loadSoundIds } = require('../../../utils');
const { en, pl, interpolate } = require("../../../localization/strings");

// Mock only the utils dependency
jest.mock('../../../utils', () => ({
  loadSoundIds: jest.fn()
}));

describe('refresh-sound-ids command', () => {
  let mockInteraction;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock interaction
    mockInteraction = {
      reply: jest.fn().mockResolvedValue({}),
      client: {
        sounds: new Map(),
        soundsIds: []
      }
    };
    
    // Default mock implementation for loadSoundIds
    loadSoundIds.mockReturnValue({
      sounds: new Map([['sound1', 'path1'], ['sound2', 'path2']]),
      soundsIds: ['sound1', 'sound2']
    });
  });

  it('should have the correct command structure', () => {
    expect(refreshSoundIdsCommand.data).toBeInstanceOf(SlashCommandBuilder);
    expect(refreshSoundIdsCommand.data.name).toBe('refresh-sound-ids');
    expect(refreshSoundIdsCommand.data.description).toBe(en.REFRESH_SOUND_IDS);
    expect(refreshSoundIdsCommand.data.description_localizations).toEqual({
      pl: pl.REFRESH_SOUND_IDS
    });
    expect(refreshSoundIdsCommand.cooldown).toBe(60);
  });

  it('should successfully refresh sound IDs', async () => {
    const mockSounds = new Map([['sound1', 'path1'], ['sound2', 'path2']]);
    const mockSoundIds = ['sound1', 'sound2'];
    
    loadSoundIds.mockReturnValue({
      sounds: mockSounds,
      soundsIds: mockSoundIds
    });

    await refreshSoundIdsCommand.execute(mockInteraction);
    
    // Check that loadSoundIds was called
    expect(loadSoundIds).toHaveBeenCalledTimes(1);
    
    // Check that client data was updated
    expect(mockInteraction.client.sounds).toBe(mockSounds);
    expect(mockInteraction.client.soundsIds).toBe(mockSoundIds);
    
    // Check that the reply was sent with the correct message
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: interpolate(pl.SOUND_IDS_REFRESHED_LOADED_N_SOUNDS, { n: mockSoundIds.length }),
      flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications]
    });
  });

  it('should load new sound IDs and replace the old ones', async () => {
    // Setup initial client state with some sounds
    const initialSounds = new Map([['oldSound', 'oldPath']]);
    const initialSoundIds = ['oldSound'];
    mockInteraction.client.sounds = initialSounds;
    mockInteraction.client.soundsIds = initialSoundIds;
    
    // Define new sounds to be loaded
    const newSounds = new Map([['newSound1', 'newPath1'], ['newSound2', 'newPath2']]);
    const newSoundIds = ['newSound1', 'newSound2'];
    
    // Mock loadSoundIds to return new sounds
    loadSoundIds.mockReturnValue({
      sounds: newSounds,
      soundsIds: newSoundIds
    });

    // Execute the command
    await refreshSoundIdsCommand.execute(mockInteraction);
    
    // Verify that the client now has the new sounds
    expect(mockInteraction.client.sounds).toBe(newSounds);
    expect(mockInteraction.client.sounds).not.toBe(initialSounds);
    expect(mockInteraction.client.soundsIds).toBe(newSoundIds);
    expect(mockInteraction.client.soundsIds).not.toBe(initialSoundIds);
    
    // Verify the old sounds are replaced
    expect(mockInteraction.client.sounds.has('oldSound')).toBeFalsy();
    expect(mockInteraction.client.sounds.has('newSound1')).toBeTruthy();
    expect(mockInteraction.client.sounds.has('newSound2')).toBeTruthy();
    
    expect(mockInteraction.client.soundsIds).toContain('newSound1');
    expect(mockInteraction.client.soundsIds).toContain('newSound2');
    expect(mockInteraction.client.soundsIds).not.toContain('oldSound');
  });

  it('should handle errors during refresh', async () => {
    // Mock loadSoundIds to throw an error
    loadSoundIds.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    await refreshSoundIdsCommand.execute(mockInteraction);
    
    // Check that error was logged
    expect(console.error).toHaveBeenCalledWith('Error refreshing sound IDs:', expect.any(Error));
    
    // Check that the error message was sent to the user
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: pl.FAILED_TO_REFRESH_SOUND_IDS,
      flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications]
    });
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});