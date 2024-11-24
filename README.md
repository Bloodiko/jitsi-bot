# Jitsi Bot

Repository for my Jitsi Bot.

Repository contains 
* Jitsi Bot
* Jitsi Soundboard Bot
* Service Worker (non functional for now)
* some audio and video files for the Soundboard - I do Not own the rights to these files, they are owned by their respective owners and only included for showcase purposes.

### Run the Bot Online here:

[Bot Selection Site](https://bloodiko.github.io/jitsi-bot/jitsi-bot/jitsi.html) ← Click to try it out

jitsi.html?room=jitsiroomname

## Features:

- /help # Use this to show all available commands. 
- /ban
- /banlist
- /unban
- /muteAll
- /admin passwd - grants Moderator
- /quit - exits bot
- /reload - reloads bot
- /timeoutConf [time in minutes] - Forcefully ends the conference for all
  participants after the given time. - Will notify in certain intervals.
- /setSubject [title] - sets Jitsi Room Name (Top of the screen next to
  Duration)
- /joinSoundboard - joins the Soundboard to the conference, only works with meet.jit.si for the moment.
- ... Many more 

## Installation

1. Download Repository
2. Run a static webserver (e.g. `python3 -m http.server 8080`) or just run the
   `jitsi.html` file
3. Open `http://localhost:8080/jitsi.html?room=jitsiroomname` in your browser
4. Enter your the Roomname and select "custom" in the dropdown

## Usage

Important: On the Public meet.jit.si Server you need to open the Room first manually.
Send a Private Message to the Bot with a command.

For a different Domain you need to pass additional parameters to the URL:

```js
// join params with &
domain // domain as listed in config.hosts (e.g. meet.jit.si)
bosh // BOSH URL (e.g. https://meet.jit.si/http-bind) can often be omitted
wsKeepAlive //(Websocket Keep Alive URL, without domain) can often be omitted
useTurnUdp // (No Value)
disableAnonymousdomain // (No Value)
disableFocus // (No Value)
disableGuest // (No Value)
```

![Mini Showcase][showcase]

![Help Command in Chat][def]


[def]: images/privateMessage_help.png
[showcase]: images/Mini-Showcase.png