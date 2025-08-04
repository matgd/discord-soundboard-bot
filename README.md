# Personal soundboard bot for Discord

...because price of Discord Nitro is fucking outrageous.  

![Jest Tests](https://github.com/matgd/discord-soundboard-bot/actions/workflows/jest.yml/badge.svg?branch=master)  

`config.json`
- `token`: OAuth2 token for BOT
- `clientId`: BOT application ID
- `guildId`: Server ID
  
`clientId`: Your application's client id (Discord Developer Portal > "General Information" > application id)  
`guildId`: Your development server's id (Enable developer mode > Right-click the server title > "Copy ID")
  
NOTE:
Set `guildId` to server you want deploy commands to

  
- `node .` start bot
- `node deploy-commands.js` - update commands
- `npm test` - run tests

## Sounds format
  
`./sounds/*.mp3`


## DietPi

RPi 3B+
```
sudo apt install make libtool autoconf automake g++
```

## Tests

```
npm test
```

## Config json
`config.json.dev` stores real app

## dataStore
`dataStore/saved-data.json` is an empty object
