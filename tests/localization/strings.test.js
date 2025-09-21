const { it, expect } = require('@jest/globals');
const { en, pl, interpolate } = require('../../localization/strings');

describe('strings', () => {
  it('should have the same keys', () => {
    const missingEn = Object.keys(pl).filter(key => !en.hasOwnProperty(key));
    const missingPl = Object.keys(en).filter(key => !pl.hasOwnProperty(key));

    expect(missingEn).toHaveLength(0);
    expect(missingPl).toHaveLength(0);
  });

  it('should interpolate correctly in pl', () => {
    const channelName = 'Test Channel';
    const localizationText = "Cześć z {channel}"

    const interpolatedString = interpolate(localizationText, { channel: channelName });
    expect(interpolatedString).toBe(`Cześć z ${channelName}`);
  });

  it('should interpolate correctly in en', () => {
    const channelName = 'Test Channel';
    const localizationText = "Hello from {channel}"

    const interpolatedString = interpolate(localizationText, { channel: channelName });
    expect(interpolatedString).toBe(`Hello from ${channelName}`);
  });

  it('should interpolate correctly with shorthand', () => {
    const channel = 'Test Channel';
    const localizationText = "Cześć z {channel}"

    const interpolatedString = interpolate(localizationText, { channel });
    expect(interpolatedString).toBe(`Cześć z ${channel}`);
  });
});
