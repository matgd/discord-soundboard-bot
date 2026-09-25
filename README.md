# Discord Soundboard Bot

A for-fun Discord bot for custom sounds, voice-channel statistics, favourites, and scheduled reminders.

![Jest Tests](https://github.com/matgd/discord-soundboard-bot/actions/workflows/jest.yml/badge.svg?branch=master)

## About this project

Discord Soundboard Bot is a personal Discord bot built with Node.js and discord.js. It started as a for-fun alternative to paying for a soundboard and grew into a collection of tools for our voice channels. I built it to solve small problems in a real server while working with event-driven code, persistent state, and testable command logic.

### What it does

- Plays custom MP3 sounds through slash commands, autocomplete, searchable button menus, and random playback.
- Lets each user save and manage their favourite sounds.
- Tracks voice-channel time and days present, with leaderboards for different time periods.
- Checks whether selected people have joined a voice channel at a scheduled time and reminds those who have not.
- Supports English and Polish in selected commands and leaderboard messages.

### Design choices

- Commands live in separate modules, while shared helpers handle sound lookup, autocomplete, and button layouts.
- Voice history is stored locally in SQLite, while a small JSON file holds user favourites. This keeps the bot independent of a hosted database.
- Active voice sessions are saved and recovered after a restart. Completed sessions are kept only when another person was present in the channel, and old entries are pruned after a year.
- A day starts at 4 AM for attendance statistics, so late-night conversations are counted together.
- Jest tests cover session recovery, date calculations, localization, and selected command behaviour. Credentials, runtime data, and personal sound files stay outside version control.

## Getting started

The bot requires Node.js 22.12 or newer, a Discord bot token, and a server where you can register its slash commands.

1. Install dependencies: `npm ci`.
2. Create a `sounds/` directory and add your MP3 files.
3. Create `config.json`:

   ```json
   {
     "token": "YOUR_BOT_TOKEN",
     "clientId": "YOUR_APPLICATION_ID",
     "guildId": "YOUR_SERVER_ID"
   }
   ```

4. Register commands for that server: `node deploy-commands.js`.
5. Start the bot: `node .`.

`config.json` contains a secret and is ignored by Git. You can find the application ID in the Discord Developer Portal. To copy a server ID, enable Developer Mode in Discord.

## Sound files

Put your own `.mp3` files in `sounds/`. The directory must exist when the bot starts; personal sound files are not included in this repository.

File names are used to identify and display sounds in the bot, so keep them short and distinct. Only files with a lowercase `.mp3` extension are picked up.

## Raspberry Pi / DietPi

The project includes setup notes for a Raspberry Pi 3B+ running DietPi. Build tools used for native dependencies can be installed with:

```sh
sudo apt install make libtool autoconf automake g++
```

Install a compatible Node.js version before running `npm ci`. The current dependency versions have not been retested on the Raspberry Pi 3B+, so treat this as a starting point rather than a verified installation guide.

## Local data and tests

The bot creates `dataStore/` automatically. It stores favourites in JSON and voice-channel history in SQLite; runtime data is ignored by Git.

Run the test suite with `npm test`.
