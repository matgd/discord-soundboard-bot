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
    MAKE_BOT_JOIN_TO_THE_VOICE_CHANNEL_YOU_ARE_IN: "Make bot join to the voice channel you are in.",
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
    GET_SOUNDBOARD_FILTERED_BY_MATCHING_TEXT: "Get soundboard filtered by matching text.",
    QUERY: "query",
    QUERY_DESCRIPTION: "Search query for soundboard.",
    NO_SOUNDS_MATCHING_YOUR_QUERY: "No sounds found matching your query.",
    SHOWING_N_OF_FOUND_SOUNDS_FOR_QUERY: "Showing **{n}/{found}** sounds for query **{query}**.",
    VOICE_TIME_DESCRIPTION: "Show voice channel time leaderboard.",
    VOICE_TIME_PERIOD_DESCRIPTION: "Time period to show (default: 7 days).",
    VOICE_TIME_TITLE: "Voice time — last {days} days",
    VOICE_TIME_NO_DATA: "No voice time data for this period.",
    DAYS_PRESENT_DESCRIPTION: "Show how many days users were present in voice channels.",
    DAYS_PRESENT_PERIOD_DESCRIPTION: "Time period to check (default: 7 days).",
    DAYS_PRESENT_TITLE: "Days present — last {days} days",
    DAYS_PRESENT_NO_DATA: "No voice presence data for this period.",
    DAY_NAMES: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    DAY_SHORT: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
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
    GET_SOUNDBOARD_FILTERED_BY_MATCHING_TEXT: "Wczytaj soundboard filtrowany według pasującego tekstu.",
    QUERY: "zapytanie",
    QUERY_DESCRIPTION: "Zapytanie wyszukiwania dla soundboardu.",
    NO_SOUNDS_MATCHING_YOUR_QUERY: "Nie znaleziono dźwięków pasujących do Twojego zapytania.",
    SHOWING_N_OF_FOUND_SOUNDS_FOR_QUERY: "Pokazano **{n}/{found}** dźwięków dla zapytania **{query}**.",
    VOICE_TIME_DESCRIPTION: "Pokaż ranking czasu na kanałach głosowych.",
    VOICE_TIME_PERIOD_DESCRIPTION: "Okres czasu do wyświetlenia (domyślnie: 7 dni).",
    VOICE_TIME_TITLE: "Czas na voice — ostatnie {days} dni",
    VOICE_TIME_NO_DATA: "Brak danych o czasie na voice w tym okresie.",
    DAYS_PRESENT_DESCRIPTION: "Pokaż ile dni użytkownicy byli obecni na kanałach głosowych.",
    DAYS_PRESENT_PERIOD_DESCRIPTION: "Okres czasu do sprawdzenia (domyślnie: 7 dni).",
    DAYS_PRESENT_TITLE: "Dni obecności — ostatnie {days} dni",
    DAYS_PRESENT_NO_DATA: "Brak danych o obecności na voice w tym okresie.",
    DAY_NAMES: ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"],
    DAY_SHORT: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  },
  interpolate,
}
