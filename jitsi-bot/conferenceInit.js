function tryReconnect() {
  room.leave()
  con.disconnect()

  conferenceInit()
  roomInit()
}

function conferenceInit() {
  con = new JitsiMeetJS.JitsiConnection(null, null, options)

  const onConnectionSuccess = (ev) => {
    console.log('Connection Success')
    connectionEstablished = true
  }
  const onConnectionFailed = (ev) => {
    log('Connection Failed')
    log(
      'Conference crashed, got system Terminated, or your internet is gone. \n Trying Reconnect in 5 minutes.'
    )
    connectionEstablished = false

    setTimeout(tryReconnect, 300000)
  }
  /**
   * This function is called when we disconnect.
   */
  function disconnect() {
    log('Disconnected!')
    connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      onConnectionSuccess
    )
    connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_FAILED,
      onConnectionFailed
    )
    connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      disconnect
    )
  }

  con.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccess
  )
  con.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed
  )
  con.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect
  )

  con.connect()
}

function roomInit() {
  if (!connectionEstablished) {
    setTimeout(roomInit, 1000)
    return
  }

  const onConferenceJoined = (ev) => {
    log('Conference Joined')

    bot_started = true
    roomJoined = true

    postMessageToWorker(workerMessages.ADD_BOT, { roomName })

    if ( !typeof ws == 'undefined' && ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: wsMessages.ROOM_JOIN,
          param: {
            roomName: roomName,
            statsId: room._statsCurrentId,
          },
        })
      )
    }
  }

  room = con.initJitsiConference(roomName, options)

  room.addEventListener(
    JitsiMeetJS.events.conference.CONFERENCE_JOINED,
    onConferenceJoined
  )

  room.on(JitsiMeetJS.events.conference.CONFERENCE_LEFT, cleanupOnRoomLeft)
  room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, () => {
    log(`Conference Terminated by a Moderator`)
    cleanupOnRoomLeft()
    reloadBot('system')
  })
  room.on(JitsiMeetJS.events.conference.KICKED, (kickedByUser, message) => {
    log(
      `\tI got kicked by ${kickedByUser._displayName}. \n\tReason: ${message}`,
      LOGCLASSES.MYSELF_KICKED
    )
    cleanupOnRoomLeft()
  })

  room.on(
    JitsiMeetJS.events.conference.PARTICIPANT_KICKED,
    (kickedByUser, kickedUser, message) => {
      log(
        `\tParticipant ${kickedUser._displayName} got kicked by ${kickedByUser._displayName}. \n\tReason: ${message}`,
        LOGCLASSES.USER_KICKED
      )
    }
  )

  room.on(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (userId, message) => {
    log(
      'Message received: \n\t' +
        (getNameById(userId) || getStatsIDById(userId) || userId) +
        ': ' +
        message,
      LOGCLASSES.PUBLIC_MESSAGE
    )
    if (message.startsWith('/')) {
      // Possible Slash Command, write user a private message.
      room.sendMessage(
        'Potenial slash command detected. I only react to private messages.\nPlease send the command again as a private message to me.\nYou can use /help for a list of commands.',
        userId
      )
    }
  })
  room.on(
    JitsiMeetJS.events.conference.PRIVATE_MESSAGE_RECEIVED,
    (userId, message) => {
      log(
        'Private Message recieved: \n\t' +
          (getNameById(userId) || getStatsIDById(userId) || userId) +
          ': ' +
          message,
        LOGCLASSES.PRIVATE_MESSAGE
      )

      const firstSpaceIndex = message.indexOf(' ')
      function getCommand() {
        if (firstSpaceIndex !== -1) {
          return message.substring(0, firstSpaceIndex) // before first space is command
        } else {
          return message
        }
      }
      function getArgument() {
        if (firstSpaceIndex !== -1) {
          return message.substring(firstSpaceIndex + 1) // after first space is arguments
        } else return undefined
      }
      const command = getCommand()
      const argument = getArgument()

      console.log(command, argument)

      if ((argument == 'help') | (argument == '?')) {
        help(userId, command)
        return
      }

      try {
        commandHandler[command].handler(userId, argument) // Executing corresponding function in commandHandler List.
      } catch (error) {
        if (message.startsWith('/')) {
          if (command in commandHandler) {
            room.sendMessage('Error while Executing Command.', userId)
          } else {
            room.sendMessage('Command not found. Try /help', userId)
          }
        } else {
          room.sendMessage(
            'I wont talk back, try commands with / like /help.',
            userId
          )
        }
        console.error(error)
      }
    }
  )

  // onJoin
  room.on(JitsiMeetJS.events.conference.USER_JOINED, (userId, userObj) => {
    const displayNameReducedSpaces = userObj._displayName?.replaceAll(
      / +/g,
      ' '
    )
    const displayNameNormalized = userObj._displayName
      ?.replaceAll(' ', '')
      .toLowerCase()
    if (!displayNameNormalized) {
      return
    }
    // reduces spaces to one, but keeps the rest.
    log(
      'USER JOINED EVENT ' +
        userObj.getStatsID() +
        ': ' +
        displayNameReducedSpaces
    )

    if (
      bannedUsers.includes(displayNameNormalized) ||
      bannedStatUsers.includes(userObj.getStatsID())
    ) {
      room.sendMessage('You are Banned from this Room.', userId)
      room.kickParticipant(userId, 'You Are Banned!')
      log('Kick on Join because user is Banned from Room.')
    }

    if (displayNameNormalized.match(/^\+?\d+$/g)) {
      // check if userDisplayName is a number only - telephone number
      // --> check if known or unknown.
      printPhoneNameOrIdentifyNumber(
        displayNameNormalized,
        JitsiMeetJS.events.conference.USER_JOINED
      )
    }

    // Add Moderator on Whitelist
    if (moderatorWhitelist.has(userObj.getStatsID())) {
      room.grantOwner(userId)
      log(`Automatically granted Moderator to User ${displayNameReducedSpaces}`)
    }

    if (roomBotOptions.onJoin?.mattermostNotification) {
      //wait one second, to allow the "Auto Moderator" to potentially be applied to user, before Notification is sent.
      setTimeout(() => {
        if (!room.getParticipants().some((user) => user.isModerator())) {
          let message = `@channel Nutzer ${displayNameReducedSpaces} ist dem Jitsi Raum [${roomName}](https://meet.jit.si/${roomName}) beigetreten.`
          let body = {
            username: 'Jitsi Bot',
            icon_emoji: ':robot:',
            text: message,
          }
          sendMattermostNotificationToWebhook(
            roomBotOptions.onJoin.mattermostNotificationWebhook,
            body
          )
          log(
            `Incoming User Message sent to Mattermost Webhook ${roomBotOptions.onJoin.mattermostNotificationWebhook}.`
          )
        }
      }, 1000)
    }
    printParticipants()
  })

  room.on(JitsiMeetJS.events.conference.USER_LEFT, (userId, userObj) => {
    const displayNameNormalized = userObj._displayName
      ?.replaceAll(' ', '')
      .toLowerCase()

    // reduces spaces to one, but keeps the rest.
    const displayNameReducedSpaces = userObj._displayName?.replaceAll(
      / +/g,
      ' '
    )

    if (!displayNameNormalized) {
      return
    }
    if (displayNameNormalized.match(/^\+?\d+$/g)) {
      // check if userDisplayName is a number only - telephone number
      // --> check if known or unknown.
      printPhoneNameOrIdentifyNumber(
        displayNameReducedSpaces,
        JitsiMeetJS.events.conference.USER_LEFT
      )
    }

    log(
      'USER LEFT EVENT ' +
        userObj.getStatsID() +
        ': ' +
        displayNameReducedSpaces
    )
    printParticipants()
  })

  room.on(JitsiMeetJS.events.conference.USER_ROLE_CHANGED, (userId, role) => {
    printParticipants()
    console.log(userId, ' Role Change: ', role)
    if (userId === room.myUserId() && role === 'moderator') {
      if (room.getParticipants().length > 0) {
        //if nobody in room, i'm the first one, so system is granting moderator.
        room.sendMessage('Thank you for granting me Moderator')
      }
      console.log('Setting Start muted Policy.')
      room.setStartMutedPolicy({ audio: true, video: true })

      //room.enableLobby()

      setTimeout(checkBreakout, 1000) // delay breakout creation to allow jitsi connection to fully establish.
    }
  })

  room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
    console.log(`${track.getType()} - ${track.isMuted()}`)
  })

  room.on(
    JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
    (userId, newName) => {
      printParticipants()
      if (getStatsIDById(userId) !== 'BastiBot') {
        log(`DISPLAY_NAME_CHANGED Event - ${userId}: New Name = ${newName} `)
      }
    }
  )
  room.on(
    JitsiMeetJS.events.conference.LOBBY_USER_JOINED,
    (userId, userDisplayName) => {
      console.log(
        `LOBBY_USER_JOINED Event - ${userId}: ${userDisplayName} - check auto allow/deny.`
      )
      if (userDisplayName == 'anonymous') {
        room.lobbyDenyAccess(userId) // deny access - user with suppressed telephone number.
        room.sendMessage(
          'Automatically denied access to user with suppressed telephone number.'
        )
        return
      }

      const match = userDisplayName.match(/^\+?\d+$/g) // check if userDisplayName is a number only - telephone number
      if (!match) {
        // not a phone number - allow access
        room.lobbyApproveAccess(userId)
        return
      }
    }
  )

  // other events
  const handler = (event, arg1, arg2, arg3) => {
    return
    // enable only for debug purposes
    console.log(
      `Conference Event catched - ${event}: \nArgs: ${arg1} ${arg2} ${arg3}`
    )
    console.log(arg1)
    console.log(arg2)
    console.log(arg3)
    console.log('Conference Event Args end.')
  }

  const confEvents = { ...JitsiMeetJS.events.conference }

  Object.entries(confEvents).forEach(([eventKey, eventValue]) => {
    if (skipConfEvents.includes(eventKey)) {
      console.log(`Skipping event ${eventKey}.`)
      return
    }
    console.log('Adding Event Handler for Event: ', eventKey)
    room.on(eventValue, (arg1, arg2, arg3) => {
      handler(eventKey, arg1, arg2, arg3)
    })
  })

  room.setDisplayName(options.displayName)

  room.join()

  setTimeout(() => {
    if (!room.isModerator()) {
      room.sendMessage('Please grant me Moderator to allow me to work.')
    }
  }, 2000)
}

function main() {
  if (bot_started) {
    return
  }

  JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.LOG)

  JitsiMeetJS.init()

  document.title = 'Jitsi Bot - ' + roomName

  // load White and Banlist
  loadAdminIDs()
  loadBanlist()
  loadRoomOptions()
  loadPhoneNumberNameMap()

  conferenceInit()

  log('Target: ' + roomName)

  try {
    roomInit()
  } catch (error) {
    log(error)
  }
}

main()
