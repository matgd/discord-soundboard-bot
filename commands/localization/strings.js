function interpolate(str, params = {}) {
    return str.replace(/{(\w+)}/g, (_, key) => params[key] ?? `{${key}}`);
}

module.exports = {
  en: {
    DISCONNECT_BOT_FROM_THE_VOICE_CHANNEL: "Disconnects bot from the voice channel.",
    IM_NOT_CONNECTED_TO_A_VOICE_CHANNEL: "I'm not connected to a voice channel.",
    BYE: "Bye!",
    MAKE_BOT_JOIN_TO_THE_VOICE_CHANNEL_YOU_ARE_IN: "Make_bot_join_to_the_voice_channel_you_are_in.",
    YOU_NEED_TO_BE_IN_A_VOICE_CHANNEL_TO_USE_THIS_COMMAND: "You need to be in a voice channel to use this command!",
    I_AM_ALREADY_CONNECTED_TO_A_VOICE_CHANNEL: "I am already connected to a voice channel!",
    I_AM_ALREADY_CONNECTING_TO_A_VOICE_CHANNEL: "I am already connecting to a voice channel!",
    JOINED_TO_THE_VOICE_CHANNEL_XYZ:  "Joined to the voice channel: {channel}"
  },
  pl: {
    DISCONNECT_BOT_FROM_THE_VOICE_CHANNEL: "Rozłącza bota z kanału głosowego.",
    IM_NOT_CONNECTED_TO_A_VOICE_CHANNEL: "Nie jestem połączony z kanałem głosowym.",
    BYE: "Narka!",
    MAKE_BOT_JOIN_TO_THE_VOICE_CHANNEL_YOU_ARE_IN: "Zrób, aby bot dołączył do kanału głosowego, w którym jesteś.",
    YOU_NEED_TO_BE_IN_A_VOICE_CHANNEL_TO_USE_THIS_COMMAND: "Musisz być w kanale głosowym, aby użyć tej komendy!",
    I_AM_ALREADY_CONNECTED_TO_A_VOICE_CHANNEL: "Jestem już połączony z kanałem głosowym!",
    I_AM_ALREADY_CONNECTING_TO_A_VOICE_CHANNEL: "Aktualnie łączę się z kanałem głosowym!",
    JOINED_TO_THE_VOICE_CHANNEL_XYZ: "Dołączyłem do kanału głosowego: {channel}"
  },
  interpolate,
}
