# Jitsi Bot

Repository for my Jitsi Bot.

### Run the Bot Online here:

[Bot Selection Site](https://bloodiko.github.io/jitsi-bot/jitsi-bot/jitsi.html) ← Click to try it out

jitsi.html?room=jitsiroomname

## Features:

- /help
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

Future:

- rename Breakouts
- add soundboard

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

domain=
bosh=
wsKeepAlive=  (Websocket Keep Alive URL, without domain)
useTurnUdp (No Value)

![Help Command in Chat][def]

[def]: images/privateMessage_help.png