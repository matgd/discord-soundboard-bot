function replacePolishChars(str) {
    const charMap = {
        'ą': 'a',
        'ć': 'c',
        'ę': 'e',
        'ł': 'l',
        'ń': 'n',
        'ó': 'o',
        'ś': 's',
        'ź': 'z',
        'ż': 'z'
    }

    return str.replace(/[ąćęłńóśźż]/g, function (match) {
        return charMap[match];
    });
}

function basenameToId(basename) {
    let modifiedBasename = replacePolishChars(basename);
    modifiedBasename = modifiedBasename.replace(/[^a-zA-Z0-9]/g, '-');
    return modifiedBasename.toLowerCase();
}

module.exports = {
    basenameToId,
}
