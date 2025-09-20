const { getChoiceByIncludedSubstring } = require('../../utils/autocomplete');

describe('getChoiceByIncludedSubstring function', () => {
    test('returns empty array when no choices match the input', () => {
        const input = 'xyz';
        const choices = ['abc', 'def', 'ghi'];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([]);
    });

    test('returns all matching choices within the limit', () => {
        const input = 'a';
        const choices = ['abc', 'adef', 'aghi', 'bcd'];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([
            { name: 'abc', value: 'abc' },
            { name: 'adef', value: 'adef' },
            { name: 'aghi', value: 'aghi' }
        ]);
    });

    test('respects the provided limit', () => {
        const input = 'a';
        const choices = ['abc', 'adef', 'aghi', 'axyz'];
        const limit = 2;
        const result = getChoiceByIncludedSubstring(input, choices, limit);
        expect(result).toEqual([
            { name: 'abc', value: 'abc' },
            { name: 'adef', value: 'adef' }
        ]);
    });

    test('handles empty input by returning choices up to the limit', () => {
        const input = '';
        const choices = ['abc', 'def', 'ghi'];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([
            { name: 'abc', value: 'abc' },
            { name: 'def', value: 'def' },
            { name: 'ghi', value: 'ghi' }
        ]);
    });

    test('handles empty choices array', () => {
        const input = 'a';
        const choices = [];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([]);
    });

    test('handles case sensitivity correctly', () => {
        const input = 'A';
        const choices = ['abc', 'Abc', 'ABC'];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([
            { name: 'Abc', value: 'Abc' },
            { name: 'ABC', value: 'ABC' }
        ]);
    });

    test('handles includes rule', () => {
        const input = 'def';
        const choices = ['abc', 'def', 'abcdef', 'abcdefghi', 'abcdegfhi'];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([
            { name: 'def', value: 'def' },
            { name: 'abcdef', value: 'abcdef' },
            { name: 'abcdefghi', value: 'abcdefghi' }
        ]);
    });

    test('matches multiple words in any order', () => {
        const input = 'def jkl';
        const choices = [
            'abc) def ghi jkl',
            'abc) def qwe jkl',
            'abc) def qwe xyz',
            'abc) jkl def',
            'abc) jkl',
            'def jkl',
        ];
        const result = getChoiceByIncludedSubstring(input, choices);
        expect(result).toEqual([
            { name: 'abc) def ghi jkl', value: 'abc) def ghi jkl' },
            { name: 'abc) def qwe jkl', value: 'abc) def qwe jkl' },
            { name: 'abc) jkl def', value: 'abc) jkl def' },
            { name: 'def jkl', value: 'def jkl' },
        ]);
    });
});