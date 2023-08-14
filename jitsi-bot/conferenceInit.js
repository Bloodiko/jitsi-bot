let con = null
let room = null
let isJoined = false
let roomName = ''

let bot_started = false
let roomInput = undefined

let breakout = null

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.LOG)

JitsiMeetJS.init()

const roomIDs = {
  test: 'ColouredSpicesExperienceLong',
}

const confOptions = {}

const connOptions =
  //connection options
  {
    hosts: {
      domain: 'meet.jit.si',
      muc: 'conference.meet.jit.si',
    },
    focusUserJid: 'focus@auth.meet.jit.si',
    bosh: '/http-bind',
    websocket: 'wss://meet.jit.si/xmpp-websocket',
    constraints: {
      video: {
        height: {
          ideal: 720,
          max: 720,
          min: 180,
        },
        width: {
          ideal: 1280,
          max: 1280,
          min: 320,
        },
      },
    },
    //whiteboard: {
    //   enabled: true,
    //   collabServerBaseUrl: '',
    //},
    //useTurnUdp: true,
    serviceUrl: 'wss://meet.jit.si/xmpp-websocket?room=roomname',
  }

let bannedUsers = []
let bannedStatUsers = []

let quitConferenceTimeout = undefined

let moderatorWhitelist = new Set()

const breakoutBaseName = 'Breakout-Raum #'

const logElement = document.querySelector('#log')

const log = (message) => {
  if (!logElement) {
    return
  }
  logElement.textContent += '\n' + message
  console.log(message)
}

function getStatUserByName(displayNameNormalized) {
  const statUserObj = room.getParticipants().find((user) => {
    if (
      user._displayName.replace(' ', '').toLowerCase() === displayNameNormalized
    ) {
      return true
    }
    return false
  })

  return statUserObj?.getStatsID()
}

function loadAdminIDs() {
  let localStorageAdminWhitelist =
    new Set(JSON.parse(window.localStorage.getItem('adminWhitelist'))) ||
    new Set()
  moderatorWhitelist = new Set([
    ...moderatorWhitelist,
    ...localStorageAdminWhitelist,
  ])
}

function saveAdminIDs() {
  loadAdminIDs()
  window.localStorage.setItem(
    'adminWhitelist',
    JSON.stringify([...moderatorWhitelist])
  )
}

function saveBanlist() {
  let localStorageBanlist = JSON.parse(
    window.localStorage.getItem('banlist') || '{}'
  )
  let banlistRoom = localStorageBanlist[roomName]
    ? localStorageBanlist[roomName]
    : [[], []]

  banlistRoom[0] = [...bannedUsers]
  banlistRoom[1] = [...bannedStatUsers]

  localStorageBanlist[roomName] = banlistRoom

  window.localStorage.setItem('banlist', JSON.stringify(localStorageBanlist))
}

function loadBanlist() {
  let localStorageBanlist =
    new Map(
      Object.entries(JSON.parse(window.localStorage.getItem('banlist') || '{}'))
    ) || new Map()

  let banlistRoom = localStorageBanlist.has(roomName)
    ? localStorageBanlist.get(roomName)
    : [[], []]
  bannedUsers = banlistRoom[0]
  bannedStatUsers = banlistRoom[1]
}

/* -------------------------
 * Command Handler Functions
 * -------------------------
 */

const grantAdmin = (userId, argument) => {
  if (argument !== 'admin') {
    room.sendPrivateTextMessage(userId, 'Wrong Password.')
    return
  }

  if (!room.isModerator()) {
    room.sendPrivateTextMessage(
      userId,
      'Cannot grant Moderator, I am not a moderator.'
    )
    return
  }

  room.grantOwner(userId)
  room.sendPrivateTextMessage(
    userId,
    'Command Executed, you should have admin now.'
  )

  // grab user Stat ID for Permanent Storage

  let user = room.getParticipantById(userId)
  if (!moderatorWhitelist.has(user.getStatsID())) {
    moderatorWhitelist.add(user.getStatsID())
    saveAdminIDs()
    room.sendPrivateTextMessage(
      userId,
      "You've been added to the persistant whitelist and will be granted moderator automatically on your next join."
    )
  }
}

const reloadBot = (userId) => {
  // FIXME Needs fix for node ?
  room.sendTextMessage('Reloading Bot, see ya in a second. ')
  location.reload()
}

const muteAll = (userId) => {
  room.getParticipants().forEach((user) => {
    log('Muting ' + user._displayName)
    room.muteParticipant(user._id)
  })
}

const unknownCommand = (userId) => {
  room.sendPrivateTextMessage(userId, 'Command not found')
}

const setSubject = (userId, argument) => {
  room.setSubject(argument)
  room.sendPrivateTextMessage(userId, 'Room Title Adjusted.')
}

const ban = (userId, argument) => {
  const displayNameNormalized = argument.replace(' ', '').toLowerCase()

  let statUserName = getStatUserByName(displayNameNormalized)

  if (!statUserName) {
    statUserName = 'randomasd123+' + bannedStatUsers.length + Date.now()
  }

  console.log(displayNameNormalized)
  console.log(statUserName)

  if (!room.getParticipantById(userId).isModerator()) {
    room.sendPrivateTextMessage(userId, 'You are not allowed to ban a Person.')
    return
  }

  if (
    bannedUsers.includes(displayNameNormalized) ||
    bannedStatUsers.includes(statUserName)
  ) {
    room.sendPrivateTextMessage(userId, 'Already banned. See /banlist')
  } else {
    bannedUsers.push(displayNameNormalized)
    bannedStatUsers.push(statUserName)
    room.sendPrivateTextMessage(
      userId,
      'User ' + argument.replace(' ', '') + ' banned.'
    )
  }
  saveBanlist()
}

const banlist = (userId) => {
  room.sendPrivateTextMessage(
    userId,
    'Banned User: \n' + bannedUsers.join('\n')
  )
}

const unban = (userId, argument) => {
  const displayNameNormalized = argument.replace(' ', '').toLowerCase()

  const statUserName = getStatUserByName(displayNameNormalized)

  console.log(displayNameNormalized)
  console.log(statUserName)

  if (!room.getParticipantById(userId).isModerator()) {
    room.sendPrivateTextMessage(
      userId,
      'You are not allowed to unban a Person.'
    )
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

  room.sendPrivateTextMessage(
    userId,
    'User ' + argument.replace(' ', '') + ' unbanned.'
  )

  saveBanlist()
}

const quitConferenceAfterTimeout = (userId, timeout) => {
  if (!room.isModerator()) {
    room.sendPrivateTextMessage(
      userId,
      "Cannot start Timeout, I'm not a moderator!"
    )
  }

  const timeoutInMS = timeout * 60 * 1000 // in ms
  let remainingTime = timeoutInMS

  let interval = 2

  if (quitConferenceTimeout) {
    room.sendPrivateTextMessage(
      userId,
      'There is already a forced Timeout. Cannot set.'
    )
  }

  const endConference = () => {
    room.end() // room 1 is "Conference Object", room 2 is "Room Object"
  }

  const sendTimeoutWarning = (isLast) => {
    remainingTime = Math.floor(remainingTime / interval)
    room.sendTextMessage(
      'The room will be closed in ' +
        Math.floor(remainingTime / 60 / 1000) +
        ' minutes.'
    )

    if (isLast) {
      room.sendTextMessage(
        'This is the last reminder. The room will be closed soon.'
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

  room.sendTextMessage('Timer Started, you have ' + timeout + ' minutes.')

  quitConferenceTimeout = setTimeout(
    sendTimeoutWarning,
    Math.floor(remainingTime / interval),
    false
  )
}

const quit = (userId) => {
  if (room.getParticipantById(userId).isModerator()) {
    room.sendTextMessage("I'm leaving, bye.")
    room.room.doLeave()
    window.close()
  }
}

const getBreakoutIDs = (userId) => {
  let breakoutIds = Object.keys(breakout._rooms)
  let breakoutNames = Object.values(breakout._rooms).map((room) => room.name)

  let merged = breakoutIds.map((id, index) => id + ': ' + breakoutNames[index])

  room.sendPrivateTextMessage(userId, 'BreakoutRooms: \n' + merged.join('\n'))
}

const help = (userId) => {
  const commands = [
    'Available Commands:',
    'help',
    'admin [password]',
    'reload',
    'muteAll',
    'setSubject [Meeting Title]',
    'ban [User Display Name]',
    'unban [User Display Name]',
    'banlist',
    'timeoutConf [time in minutes] # forcefully exits the conference after the given time.',
    'quit',
  ]

  room.sendPrivateTextMessage(userId, commands.join('\n'))
}

/* -----------------------------
 * Command Handler Functions End
 * -----------------------------
 */

const commandHandler = {
  '/help': help,
  '/admin': grantAdmin,
  '/reload': reloadBot,
  '/muteAll': muteAll,
  '/setSubject': setSubject,
  '/ban': ban,
  '/unban': unban,
  '/banlist': banlist,
  '/timeoutConf': quitConferenceAfterTimeout,
  '/quit': quit,
}

function conferenceInit() {
  con = new JitsiMeetJS.JitsiConnection(null, null, connOptions)

  const onConnectionSuccess = (ev) => {
    console.log('Connection Success')
    isJoined = true
  }
  const onConnectionFailed = (ev) => {
    console.log('Connection Failed')
  }

  /**
   * This function is called when we disconnect.
   */
  function disconnect() {
    console.log('disconnect!')
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

const getNameById = (userId) => {
  return room.getParticipantById(userId)?._displayName
}

function needBreakout() {
  console.log('Checking Breakout Rooms. If not 3, create 3.')
  if (!breakout) {
    breakout = room.getBreakoutRooms()
  }

  let breakoutCounter = 0
  const customBreakouts = {
    AFK: false,
    ChilloutLounge: false,
  }
  Object.keys(breakout._rooms).forEach((breakoutRoomId) => {
    console.log(breakoutRoomId, ':', breakout._rooms[breakoutRoomId].name)
    if (breakout._rooms[breakoutRoomId].name?.includes(breakoutBaseName)) {
      breakoutCounter += 1
    }
    if (
      Object.keys(customBreakouts).includes(
        breakout._rooms[breakoutRoomId].name
      )
    ) {
      customBreakouts[breakout._rooms[breakoutRoomId].name] = true
    }
  })

  return { breakoutCounter, customBreakouts }
}

function checkBreakout() {
  if (!isJoined) {
    setTimeout(checkBreakout, 3000)
    return
  }

  let breakoutStatus = needBreakout()

  while (breakoutStatus.breakoutCounter < 3) {
    // 3 Breakout Rooms should be there.
    const name = breakoutBaseName + String(breakoutStatus.breakoutCounter)
    console.log('Create Breakout Room', name)
    breakout.createBreakoutRoom(name)
    breakoutStatus.breakoutCounter++
  }

  // special Breakouts
  Object.keys(breakoutStatus.customBreakouts).forEach((breakoutName) => {
    if (!breakoutStatus.customBreakouts[breakoutName]) {
      console.log('Creating Breakout Room', breakoutName)
      breakout.createBreakoutRoom(breakoutName)
    }
  })
}

function roomInit() {
  if (!roomName) {
    console.log('No Room Name, not launching bot.')
    return
  }

  if (!isJoined) {
    setTimeout(roomInit, 1000)
    return
  }

  const onConferenceJoined = (ev) => {
    console.log('Conference Joined')

    bot_started = true // Global Var - see HTML

    document.querySelector('#start_bot_button').disabled = true
  }

  room = con.initJitsiConference(roomName, confOptions)

  room.addEventListener(
    JitsiMeetJS.events.conference.CONFERENCE_JOINED,
    onConferenceJoined
  )

  room.on(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (userId, message) => {
    log(
      'Message received: \n' + (getNameById(userId) || userId) + ': ' + message
    )
  })
  room.on(
    JitsiMeetJS.events.conference.PRIVATE_MESSAGE_RECEIVED,
    (userId, message) => {
      log(
        'Private Message recieved: \n' +
          (getNameById(userId) || userId) +
          ': ' +
          message
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
        } else return ''
      }
      const command = getCommand()
      const argument = getArgument()

      console.log(command, argument)

      try {
        commandHandler[command](userId, argument) // Executing corresponding function in commandHandler List.
      } catch (error) {
        if (message.startsWith('/')) {
          if (command in commandHandler) {
            room.sendPrivateTextMessage(
              userId,
              'Error while Executing Command.'
            )
          } else {
            room.sendPrivateTextMessage(userId, 'Command not found. Try /help')
          }
        } else {
          room.sendPrivateTextMessage(
            userId,
            'I wont talk back, try commands with / like /help.'
          )
        }
        console.error(error)
      }
    }
  )
  room.on(JitsiMeetJS.events.conference.USER_JOINED, (userId, userObj) => {
    log('USER JOINED EVENT ' + userId + ': ' + userObj._displayName)
    const displayNameNormalized = userObj._displayName
      .replace(' ', '')
      .toLowerCase()
    if (
      bannedUsers.includes(displayNameNormalized) ||
      bannedStatUsers.includes(userObj.getStatsID())
    ) {
      room.sendPrivateTextMessage(userId, 'You are Banned from this Room.')
      room.kickParticipant(userId, 'You Are Banned!')
      log('Kicked user on join because user is banned from this room.')
    }

    // Add Moderator on Whitelist
    if (moderatorWhitelist.has(userObj.getStatsID())) {
      room.grantOwner(userId)
    }
  })

  room.on(JitsiMeetJS.events.conference.USER_LEFT, (userId, userObj) => {
    log('USER LEFT EVENT ' + userId + ': ' + userObj._displayName)
  })

  room.on(JitsiMeetJS.events.conference.USER_ROLE_CHANGED, (userId, role) => {
    console.log(userId, ' Role Change: ', role)
    if (userId === room.myUserId() && role === 'moderator') {
      room.sendTextMessage('Thank you for granting me Moderator')
      console.log('Setting Start muted Policy.')
      room.setStartMutedPolicy({ audio: false, video: true })
    }
    checkBreakout()
  })

  room.on(
    JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
    (userObj, propertyKey, oldValue, newValue) => {
      console.log(
        'PARTICIPANT PROPERTY CHANGE EVENT: \n',
        userObj._displayName,
        '\n',
        propertyKey,
        ': ',
        oldValue,
        ' --> ',
        newValue
      )
    }
  )

  room.on(
    JitsiMeetJS.events.conference.USER_STATUS_CHANGED,
    (userId, newStatus) => {
      console.log('USER STATUS CHANGE EVENT \n', userId, ': ', newStatus)
    }
  )

  room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
    console.log(`${track.getType()} - ${track.isMuted()}`)
  })
  room.on(
    JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
    (userID, displayName) => console.log(`${userID} - ${displayName}`)
  )
  room.on(
    JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
    (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`)
  )
  room.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
    console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`)
  )

  room.setDisplayName('🤖')

  room.join()

  setTimeout(() => {
    if (!room.isModerator()) {
      room.sendTextMessage('Please grant me Moderator to allow me to work.')
    }
  }, 2000)

  // reload Room at midnight, to clear chat.

  const now = new Date()
  const midnight = new Date(now).setHours(24, 0, 0, 0)

  window.dailyReloadTimeout = setTimeout(() => {
    room.end()
    reloadBot
  }, midnight - now)
  console.log('Delay for reload at Midnight DEBUG: ', midnight - now)
}

function main() {
  if (bot_started) {
    return
  }

  // get page Parameter room

  const urlParams = new URLSearchParams(window.location.search)

  const targetRoom = urlParams.get('room')

  if (!targetRoom) {
    log('No room Parameter, not launching bot.')
    return
  }

  document.title = 'Jitsi Bot - ' + targetRoom

  roomName = targetRoom.replace(' ', '').toLowerCase()

  connOptions.serviceUrl = 'wss://meet.jit.si/xmpp-websocket?room=' + roomName

  // load White and Banlist
  loadAdminIDs()
  loadBanlist()

  conferenceInit()

  log('Target: ' + targetRoom)
  roomInit()
}

// Open new Tab with selected Bot as Parameter

function openBot() {
  const select = document.querySelector('#meetingSelector')

  roomInput = select.value

  const isValue = roomInput !== ''

  const isCustom = roomInput === 'custom'

  const customInput = document.querySelector('#customRoomInput').value

  const getTargetRoom = (isValue, isCustom, customInput) => {
    if (isValue) {
      if (isCustom) {
        return customInput
      }
      return roomInput
    }

    // Default case
    return roomIDs.main
  }

  window.open(
    '/jitsi-bot/jitsi-bot/jitsi.html?room=' +
      getTargetRoom(isValue, isCustom, customInput),
    '_blank'
  )
}

document.querySelector('#start_bot_button')?.addEventListener('click', openBot)
document
  .querySelector('#clearLog')
  ?.addEventListener(
    'click',
    () => (document.querySelector('#log').textContent = '')
  )

let d = new Date()
log(d)
if (d.getHours == 0 && d.getMinutes() == 0) {
  // delay bot start for a while to give jitsi time to dispose room.
  setTimeout(main, 60000)
} else {
  log('Debug: Not Waiting as time check returned false.')
  log(d.getHours() + ':' + d.getMinutes())
  main()
}
