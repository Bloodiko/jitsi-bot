/* -------------------------
 * Command Handler Functions
 * -------------------------
 */

const grantAdmin = (userId, argument) => {
  if (!roomBotOptions.adminPass) {
    room.sendMessage(
      'Admin Pass not yet set for room, please use "/setAdminPass [pass]" first!',
      userId
    )
    return
  }
  if (argument !== roomBotOptions.adminPass) {
    room.sendMessage('Wrong Password.', userId)
    return
  }

  if (!room.isModerator()) {
    room.sendMessage('Cannot grant Moderator, I am not a moderator.', userId)
    return
  }

  room.grantOwner(userId)
  room.sendMessage('Command Executed, you should have admin now.', userId)

  // grab user Stat ID for Permanent Storage

  let user = room.getParticipantById(userId)
  if (!moderatorWhitelist.has(user.getStatsID())) {
    moderatorWhitelist.add(user.getStatsID())
    saveAdminIDs()
    room.sendMessage(
      "You've been added to the channel persistant Whitelist and will be granted moderator Automatically.",
      userId
    )
  }
}

const reloadBot = (userId = 'system') => {
  // FIXME Needs fix for node ?

  if (userId === 'system') {
    log(`Reload Forced by system.`)
    location.reload()
    return
  }

  if (room.getParticipantById(userId).isModerator()) {
    room.sendMessage('Reloading Bot, see ya in a second. ')
    location.reload()
  }
}

const muteAll = (userId) => {
  room.getParticipants().forEach((user) => {
    log('Muting ' + user._displayName)
    room.muteParticipant(user._id)
  })
}

const unknownCommand = (userId) => {
  room.sendMessage('Command not found', userId)
}

const setSubject = (userId, argument) => {
  room.setSubject(argument)
  room.sendMessage('Room Title Adjusted.', userId)
}

const ban = (userId, argument) => {
  const displayNameNormalized = argument.replaceAll(' ', '').toLowerCase()

  let statUserName = getStatUserByName(displayNameNormalized)

  if (!statUserName) {
    statUserName = 'randomasd123+' + bannedStatUsers.length + Date.now()
  }

  console.log(displayNameNormalized)
  console.log(statUserName)

  if (!room.getParticipantById(userId).isModerator()) {
    room.sendMessage('You are not allowed to ban a Person.', userId)
    return
  }

  if (
    bannedUsers.includes(displayNameNormalized) ||
    bannedStatUsers.includes(statUserName)
  ) {
    room.sendMessage('Already banned. See /banlist', userId)
  } else {
    bannedUsers.push(displayNameNormalized)
    bannedStatUsers.push(statUserName)
    room.sendMessage('User ' + argument.replace(' ', '') + ' banned.', userId)
  }
  saveBanlist()
}

const banlist = (userId) => {
  room.sendMessage('Banned Users: \n' + bannedUsers.join('\n'), userId)
}

const unban = (userId, argument) => {
  const displayNameNormalized = argument.replaceAll(' ', '').toLowerCase()

  const statUserName = getStatUserByName(displayNameNormalized)

  console.log(displayNameNormalized)
  console.log(statUserName)

  if (!room.getParticipantById(userId).isModerator()) {
    room.sendMessage('You are not allowed to unban a Person.', userId)
    return
  }

  let indexStatuser = bannedStatUsers.indexOf(statUserName)
  let indexBanneduser = bannedUsers.indexOf(displayNameNormalized)

  if (indexStatuser !== indexBanneduser) {
    console.log(
      'IndexStatuser could not be identified, deleting same index as bannedUser'
    )
    indexStatuser = indexBanneduser
  }

  bannedStatUsers.splice(indexStatuser, 1)
  bannedUsers.splice(indexBanneduser, 1)

  room.sendMessage('User ' + argument.replace(' ', '') + ' unbanned.', userId)

  saveBanlist()
}

const quitConferenceAfterTimeout = (userId, timeout) => {
  if (!room.isModerator()) {
    room.sendMessage("Cannot start Timeout, I'm not a moderator!", userId)
  }

  const timeoutInMS = timeout * 60 * 1000 // in ms
  let remainingTime = timeoutInMS

  let interval = 2

  if (quitConferenceTimeout) {
    room.sendMessage('There is already a forced Timeout. Cannot set.', userId)
  }

  const endConference = () => {
    room.end() // room 1 is "Conference Object", room 2 is "Room Object"
  }

  const sendTimeoutWarning = (isLast) => {
    remainingTime = Math.floor(remainingTime / interval)
    room.sendMessage(
      'Der Raum wird in ' +
        Math.floor(remainingTime / 60 / 1000) +
        ' Minuten geschlossen.'
    )

    if (isLast) {
      room.sendMessage(
        'Dies ist der Letzte Reminder. Der Raum wird in Kürze geschlossen.'
      )
      quitConferenceTimeout = setTimeout(endConference, remainingTime)
      return
    }

    quitConferenceTimeout = setTimeout(
      sendTimeoutWarning,
      Math.floor(remainingTime / interval),
      Math.floor(remainingTime / interval) < 60000
    )
  }

  room.sendMessage('Timer Started, you have ' + timeout + ' minutes.')

  quitConferenceTimeout = setTimeout(
    sendTimeoutWarning,
    Math.floor(remainingTime / interval),
    false
  )
}

const quit = (userId) => {
  if (room.getParticipantById(userId).isModerator()) {
    room.sendMessage("I'm leaving, bye.")
    room.room.doLeave()
    window.close()
  } else {
    room.sendMessage(
      'Sorry, you are not a Moderator. You need Moderator in this room to make me leave.'
    )
  }
}

const getBreakoutIDs = (userId) => {
  let breakoutIds = Object.keys(breakout._rooms)
  let breakoutNames = Object.values(breakout._rooms).map((room) => room.name)

  let merged = breakoutIds.map((id, index) => id + ': ' + breakoutNames[index])

  room.sendMessage('BreakoutRooms: \n' + merged.join('\n'), userId)
}

const addBreakout = (userId, argument) => {
  if (!room.isModerator()) {
    room.sendMessage('I am not moderator, cannot add Breakout.', userId)
    return
  }
  breakout.createBreakoutRoom(argument)
  room.sendMessage('Breakout created with specified name.', userId)
}

const joinExternalRoom = (userId, argument) => {
  window.open('/jitsi-bot/jitsi.html?room=' + argument, '_blank')

  room.sendMessage(
    'Started bot in Room ' +
      argument +
      '\nPlease check:\nhttps://meet.jit.si/' +
      argument,
    userId
  )
}

const broadcastMessage = (userId, argument) => {
  // set lastUserWhoExecutedCommand as this is a worker function.
  lastUserWhoExecutedCommand = userId
  postMessageToWorker(workerMessages.BROADCAST_MESSAGE, {
    message: argument,
    sourceRoomName: roomName,
  })
}

const sendMessage = (userId, argument) => {
  // set lastUserWhoExecutedCommand as this is a worker function.
  lastUserWhoExecutedCommand = userId
  const splitArg = argument.split(' ')
  const toRoom = splitArg.shift().toLowerCase()
  const message = splitArg.join(' ')
  postMessageToWorker(workerMessages.SEND_MESSAGE, {
    message: message,
    roomName: toRoom,
    sourceRoomName: roomName,
  })
}

const joinSoundBot = (userId) => {
  window.open('/soundboard/soundboard.html?room=' + roomName, '_blank')
}

const setAdminPass = (userId, argument) => {
  const [oldPass, newPass] = argument.split(' ')
  if (!roomBotOptions.adminPass) {
    // only one parameter since new room.
    roomBotOptions.adminPass = oldPass
  } else {
    if (roomBotOptions.adminPass !== oldPass) {
      room.sendMessage('Incorrect old Admin Pass, cannot change.', userId)
      return
    }
    roomBotOptions.adminPass = newPass
  }
  saveRoomOptions()
  room.sendMessage('Admin password set.', userId)
}

const addMattermostNotificationOnJoin = (userId, argument) => {
  if (argument.length < 25) {
    room.sendMessage(
      'Webhook ID probably malformed or none entered, keeping old config.',
      userId
    )
    return
  }

  roomBotOptions.onJoin = {
    mattermostNotification: true,
    mattermostNotificationWebhook: argument,
  }

  saveRoomOptions()

  room.sendMessage('Enabled Mattermost Notification on UserJoin.', userId)
}

const toggleMattermostNotificationOnJoin = (userId) => {
  if (roomBotOptions.onJoin) {
    roomBotOptions.onJoin.mattermostNotification =
      !roomBotOptions.onJoin.mattermostNotification || false
  }
  saveRoomOptions()

  room.sendMessage(
    `Toggled Mattermost Notification on UserJoin. --> now ${
      roomBotOptions.onJoin?.mattermostNotification ? 'Enabled' : 'Disabled'
    }`,
    userId
  )
}

const rollRandomParticipant = (userId) => {
  const randomIndex = Math.floor(room.getParticipants().length * Math.random())
  const participant = room.getParticipants()[randomIndex]

  const requestingUser = room.getParticipantById(userId)

  room.sendMessage(
    `${requestingUser._displayName?.replace(
      ' ',
      ''
    )} requested a random participant roll: \nCongratulations to\n${participant._displayName?.replace(
      ' ',
      ''
    )}`
  )
}

const identifyNumber = (userId, argument) => {
  let split = argument.split(' ')
  const phoneNumber = split.shift()
  const name = split.join(' ')

  if (!phoneNumber.match(/^\+?\d+$/g)) {
    room.sendMessage(`Error: 1st Argument is not a phone Number.`, userId)
    help(userId, '/identifyNumber')
    return
  }

  if (name.length < 1) {
    room.sendMessage(`Error: 2nd Argument is an invalid name.`, userId)
    help(userId, '/identifyNumber')
    return
  }

  phoneNumberNamesMap[phoneNumber] = name
  room.sendMessage(
    `Phone Number ${phoneNumber} has been identified as name ${name}. If this is wrong, use /identifyNumber again.`
  )
  savePhoneNumberNameMap()
}

const about = (userId, argument) => {
  room.sendMessage(
    `Created by Bloodiko\nGithub: https://github.com/bloodiko/jitsi-bot\n`,
    userId
  )
}

const help = (userId, argument) => {
  if (argument) {
    if (!argument.startsWith('/')) {
      argument = `/${argument}` // prepend slash to be commandHandler list conform
    }

    if (!argument in commandHandler) {
      room.sendMessage(
        'Command does not exist, no help available. Try /help',
        userId
      )
      return
    }

    room.sendMessage(
      `\
      Description: \n${commandHandler[argument].helptext}\n\
      Syntax: \n${commandHandler[argument].syntax}\n\
      Reqirements: \n${commandHandler[argument].requirements}\n\
      Example(s): \n${commandHandler[argument].example}`,
      userId
    )
    return
  }

  const generalHelptext = `Available Commands: \n${Object.keys(
    commandHandler
  ).join('\n')}\n\n\
  To get more info about any command use /help COMMAND`

  room.sendMessage(generalHelptext, userId)
}

/* -----------------------------
 * Command Handler Functions End
 * -----------------------------
 */

const commandHandler = {
  '/help': {
    handler: help,
    helptext:
      'Shows this help. To get more info about any command.\nArguments in brackets - example [COMMAND] - are optional.\nArguments without are mandatory. Do not write [] as argument, only the actual content.',
    syntax: '/help [COMMAND]',
    requirements: 'None',
    example: '/help\n/help admin',
  },
  '/admin': {
    handler: grantAdmin,
    helptext:
      'This will attempt to grant the requesting Person Moderator/Admin privileges within the current room.\n If successful, the Person will be granted moderator and will be automatically granted moderator/admin on joining the room.',
    syntax: '/admin PASSWORD',
    requirements: 'Bot must be moderator/admin',
    example: '/admin admin',
  },
  '/reload': {
    handler: reloadBot,
    helptext:
      'Will restart current bot. You are requested to provide the Bot Moderator again after re-join.',
    syntax: '/reload',
    requirements: 'User must be moderator',
    example: '/reload',
  },
  '/muteAll': {
    handler: muteAll,
    helptext: '',
    syntax: '/muteAll',
    requirements: 'None',
    example: '/muteAll',
  },
  '/setSubject': {
    handler: setSubject,
    helptext: 'Sets the Room Name (will not change the URL)',
    syntax: '/setSubject SUBJECT',
    requirements: 'None',
    example: '/setSubject Hallo Welt!',
  },
  '/ban': {
    handler: ban,
    helptext:
      'Bans the specified user. Banned users will be blocked from joining the the current conference - other rooms will still work. Symbols must be included. Spaces are ignored.',
    syntax: '/ban DISPLAYNAME',
    requirements: 'You must be Moderator',
    example: '/ban Benutzer1',
  },
  '/unban': {
    handler: unban,
    helptext: 'Unbans the specified user. The user can join again.',
    syntax: '/unban DISPLAYNAME',
    requirements: 'You must be Moderator',
    example: '/unban Benutzer1',
  },
  '/banlist': {
    handler: banlist,
    helptext: 'Views currently banned users for the current room.',
    syntax: '/banlist',
    requirements: 'None',
    example: '/banlist',
  },
  '/timeoutConf': {
    handler: quitConferenceAfterTimeout,
    helptext:
      'This will start a set countdown. At the end of the Timeout, the conference will be closed forcefully. Several warnings will be sent before termination.',
    syntax: '/timeoutConf MINUTES',
    requirements: 'Bot must be moderator.',
    example: '/timeoutConf 60',
  },
  '/quit': {
    handler: quit,
    helptext:
      'Disconnects the Bot from the current room. It will not rejoin unless invited again.',
    syntax: '/quit',
    requirements: 'You must be moderator.',
    example: '/quit',
  },
  '/addBreakout': {
    handler: addBreakout,
    helptext: 'Creates a breakout room with the specified name.',
    syntax: '/addBreakout NAME',
    requirements: 'Bot must be moderator.',
    example: '/addBreakout Kaffeeküche',
  },
  '/joinExternalRoom': {
    handler: joinExternalRoom,
    helptext: 'Attempts to join another conference.',
    syntax: '/joinExternalRoom ROOMNAME',
    requirements: 'None',
    example: '/joinExternalRoom konferenz1',
  },
  '/joinSoundBot': {
    handler: joinSoundBot,
    helptext: 'Attempts to spawn a SoundBot in the current room.',
    syntax: '/joinSoundBot',
    requirements: 'None',
    example: '/joinSoundBot',
  },
  '/sendMessage': {
    handler: sendMessage,
    helptext: 'Allows sending a specified message to another jitsi room.',
    syntax: '/sendMessage ROOMNAME MESSAGE',
    requirements:
      'Both Rooms must have a bot started on the same instance. The message will be passed by the bot to the chat. It will include Source Room Name.',
    example: '/sendMessage conference1 Hallo Conference 1.',
  },
  '/sendBroadcast': {
    handler: broadcastMessage,
    helptext:
      'sends a Broadcast Message to all bots connected on the same instance.',
    syntax: '/sendBroadcast MESSAGE',
    requirements: 'None',
    example: '/sendBroadcast Mittagessen ist angekommen.',
  },
  '/enableMMNotificationOnJoin': {
    handler: addMattermostNotificationOnJoin,
    helptext:
      'This will send a custom Mattermost notification whenever a non-moderator-user joins the room.',
    syntax: '/enableMMNotificationOnJoin MATTERMOST_WEBHOOK_ID',
    requirements: 'Mattermost Webhook must exist.',
    example: '/enableMMNotificationOnJoin assmfaf8hbbu3rahk6wrm3u3ya',
  },
  '/toggleMMNotificationOnJoin': {
    handler: toggleMattermostNotificationOnJoin,
    helptext:
      'Toggle the Mattermost Notification on User Join on or off. Will print current setting.',
    syntax: '/toggleMMNotificationOnJoin',
    requirements: 'None',
    example: '/toggleMMNotificationOnJoin',
  },
  '/setAdminPass': {
    handler: setAdminPass,
    helptext:
      'Set or Edit the current admin password for this room. The admin password will be saved per Room. Please do not include spaces in your password. Anything else works.',
    syntax: '/setAdminPass [OLD_PASSWORD] NEW_PASSWORD',
    requirements: 'None',
    example: '/setAdminPass admin admin_new\n/setAdminPass initialPassword',
  },
  '/randomParticipant': {
    handler: rollRandomParticipant,
    helptext:
      'Rolls a random user from all currently connected users. Will print out in public chat.',
    syntax: '/randomParticipant',
    requirements: 'None',
    example: '/randomParticipant',
  },
  '/identifyNumber': {
    handler: identifyNumber,
    helptext:
      'Allows identifying a phone number as known. If known, the name will be published on join.',
    syntax: '/identifyNumber NUMBER NAME',
    example: '/identifyNumber 30757 Bastian Jesuiter DI42 ...',
  },
  '/about': {
    handler: about,
    helptext: 'View Meta-Information about this bot',
    syntax: '/about',
    example: '/about',
  },
}
