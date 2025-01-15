const { generateDependencyReport } = require('@discordjs/voice');

console.log(generateDependencyReport());

/*
Core Dependencies
    These are dependencies that should definitely be available.
Opus Libraries
    If you want to play audio from many different file types, or alter volume in real-time, you will need to have one of these.
Encryption Libraries
    You should have at least one encryption library installed to use @discordjs/voice.
FFmpeg
    If you want to play audio from many different file types, you will need to have FFmpeg installed.
    If libopus is enabled, you will be able to benefit from increased performance if real-time volume alteration is disabled.
*/

