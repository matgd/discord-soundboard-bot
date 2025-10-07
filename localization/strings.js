/**
 * Replaces placeholders in a string with corresponding values from the params object.
 *
 * Placeholders are defined using curly braces, e.g. `{key}`.
 * If a key is not found in params, the placeholder remains unchanged.
 *
 * @param {string} str - The string containing placeholders to interpolate.
 * @param {Object} [params={}] - An object containing key-value pairs for interpolation.
 * @returns {string} The interpolated string with placeholders replaced by their values.
 */
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
    JOINED_TO_THE_VOICE_CHANNEL_XYZ:  "Joined to the voice channel: {channel}",
    WE_ARE_SCHEDULED: "We are scheduled...",
    PLAY_RANDOM_SOUND: "Play random sound.",
    PLAY_ONE_OF_AVAILABLE_SOUNDS: "Play one of available sounds.",
    IDENTIFIER: "identifier",
    IDENTIFIER_DESCRIPTION: "Name identifier of sound.",
    REFRESH_SOUND_IDS: "Refresh sound IDs.",
    SOUND_IDS_REFRESHED_LOADED_N_SOUNDS: "Sound IDs refreshed, loaded {n} sounds.",
    FAILED_TO_REFRESH_SOUND_IDS: "Failed to refresh sound IDs.",
  },
  pl: {
    DISCONNECT_BOT_FROM_THE_VOICE_CHANNEL: "Rozłącza bota z kanału głosowego.",
    IM_NOT_CONNECTED_TO_A_VOICE_CHANNEL: "Nie jestem połączony z kanałem głosowym.",
    BYE: "Narka!",
    MAKE_BOT_JOIN_TO_THE_VOICE_CHANNEL_YOU_ARE_IN: "Zrób, aby bot dołączył do kanału głosowego, w którym jesteś.",
    YOU_NEED_TO_BE_IN_A_VOICE_CHANNEL_TO_USE_THIS_COMMAND: "Musisz być w kanale głosowym, aby użyć tej komendy!",
    I_AM_ALREADY_CONNECTED_TO_A_VOICE_CHANNEL: "Jestem już połączony z kanałem głosowym!",
    I_AM_ALREADY_CONNECTING_TO_A_VOICE_CHANNEL: "Aktualnie łączę się z kanałem głosowym!",
    JOINED_TO_THE_VOICE_CHANNEL_XYZ: "Dołączyłem do kanału głosowego: {channel}",
    WE_ARE_SCHEDULED: "Jesteśmy umówieni...",
    PLAY_RANDOM_SOUND: "Odtwórz losowo jeden z dostępnych dźwięków.",
    PLAY_ONE_OF_AVAILABLE_SOUNDS: "Odtwórz jeden z dostępnych dźwięków.",
    IDENTIFIER: "identyfikator",
    IDENTIFIER_DESCRIPTION: "Nazwa identyfikująca dźwięk.",
    REFRESH_SOUND_IDS: "Odśwież identyfikatory dźwięków.",
    SOUND_IDS_REFRESHED_LOADED_N_SOUNDS: "Identyfikatory dźwięków odświeżone, załadowano {n} dźwięków.",
    FAILED_TO_REFRESH_SOUND_IDS: "Nie udało się odświeżyć identyfikatorów dźwięków.",
  },
  interpolate,
}
