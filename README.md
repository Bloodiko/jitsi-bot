# Jitsi Bot

Repository for my Jitsi Bot.

jitsi.html?room=jitsiroomname

Features:

- /help
- /ban
- /banlist
- /unban
- /muteAll - currently bugged !
- /admin passwd - grants Moderator
- /quit - exits bot
- /reload - realoads bot
- /timeoutConf [time in minutes] - Forcefully ends the conference for all
  participants after the given time. - Will notify in certain intervals.
- /setSubject [title] - sets Jitsi Room Name (Top of the screen next to
  Duration)

Future:

- create / rename Breakouts
- fix mute
- add soundboard

## Installation

1. Download Repository
2. Run a static webserver (e.g. `python3 -m http.server 8080`) or just run the
   `jitsi.html` file
3. Open `http://localhost:8080/jitsi.html?room=jitsiroomname` in your browser
4. Enter your the Roomname and select "custom" in the dropdown

## Usage

Send a Private Message to the Bot with a command.

![Help Command in Chat][def]

[def]: images/privateMessage_help.png