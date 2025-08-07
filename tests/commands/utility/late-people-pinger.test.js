const { it, expect } = require('@jest/globals');
const { getUserIds, convertProvidedTime, TimeConvertResult, getTimeSetMessage } = require('../../../commands/utility/late-people-pinger');

describe('getUserIds', () => {
    it('extracts user IDs from mentions with exclamation mark', () => {
        const input = '<@!1234567890> <@!0987654321>';
        expect(getUserIds(input)).toEqual(['1234567890', '0987654321']);
    });

    it('extracts user IDs from mentions without exclamation mark', () => {
        const input = '<@1234567890> <@0987654321>';
        expect(getUserIds(input)).toEqual(['1234567890', '0987654321']);
    });

    it('returns empty array if no mentions are present', () => {
        const input = 'no mentions here';
        expect(getUserIds(input)).toEqual([]);
    });

    it('handles mixed valid and invalid mentions', () => {
        const input = '<@1234567890> notamention <@!0987654321> <@invalid>';
        expect(getUserIds(input)).toEqual(['1234567890', '0987654321']);
    });

    it('handles empty string', () => {
        expect(getUserIds('')).toEqual([]);
    });
});

describe('convertProvidedTime', () => {
    it('returns delay 0 and no error for "teraz"', () => {
        const result = convertProvidedTime('teraz');
        expect(result).toBeInstanceOf(TimeConvertResult);
        expect(result.delay).toBe(0);
        expect(result.errorMsg).toBeNull();
    });

    it('returns correct delay and no error for valid HH:MM in the future', () => {
        const now = new Date();
        const future = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
        const hh = String(future.getHours()).padStart(2, '0');
        const mm = String(future.getMinutes()).padStart(2, '0');
        const result = convertProvidedTime(`${hh}:${mm}`);
        expect(result).toBeInstanceOf(TimeConvertResult);
        expect(result.errorMsg).toBeNull();
        expect(result.delay).toBeGreaterThan(0);
    });

    it('returns error for invalid time format', () => {
        const result = convertProvidedTime('notatime');
        expect(result).toBeInstanceOf(TimeConvertResult);
        expect(result.delay).toBeNull();
        expect(result.errorMsg).toMatch(/niepoprawny format/);
    });

    it('returns error for past time', () => {
        const now = new Date();
        const past = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
        const hh = String(past.getHours()).padStart(2, '0');
        const mm = String(past.getMinutes()).padStart(2, '0');
        const result = convertProvidedTime(`${hh}:${mm}`);
        expect(result).toBeInstanceOf(TimeConvertResult);
        expect(result.delay).toBeNull();
        expect(result.errorMsg).toMatch(/minęło/);
    });
});

describe('getTimeSetMessage', () => {
    it('returns the correct message for "teraz"', () => {
        const result = getTimeSetMessage('kanał-testowy', 'teraz');
        expect(result).toBe('Taktyczny najman ustawiony teraz. Będę monitorować kanał głosowy kanał-testowy.');
    });

    it('returns the correct message for a specific time', () => {
        const result = getTimeSetMessage('kanał-testowy', '12:00');
        expect(result).toBe('Taktyczny najman ustawiony na dzisiaj 12:00. Będę monitorować kanał głosowy kanał-testowy.');
    });
});