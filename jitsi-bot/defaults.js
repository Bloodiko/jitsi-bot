let con = null
let room = null
let connectionEstablished = false
let roomJoined = false
let roomName = ''

let bot_started = false
let roomInput = undefined

const logElement = document.querySelector('#log')

const log = (message, customClass = LOGCLASSES.BOT_INTERNAL_LOG) => {
  if (!logElement) {
    return
  }

  // get current hour:minute:second
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  const text = `${hours < 10 ? '0' + hours : hours}:${
    minutes < 10 ? '0' + minutes : minutes
  }:${seconds < 10 ? '0' + seconds : seconds} ${message}`

  // create a new paragraph element
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  customClass && div.classList.add(customClass)

  // insert new message at the top of the log
  logElement.insertBefore(div, logElement.firstChild)
  console.log(message)
}

const LOGCLASSES = {
  PRIVATE_MESSAGE: 'privateMessage',
  PUBLIC_MESSAGE: 'publicMessage',
  GENERIC_EVENT: 'event',
  BOT_INTERNAL_LOG: 'internal',
  USER_KICKED: 'kickedOther',
  MYSELF_KICKED: 'kickedSelf',
}

// default objects needed in ConferenceInit.js
let breakout = null

let localTracks = {
  audio: [],
  video: [],
}
const remoteTracks = {}

let bannedUsers = []
let bannedStatUsers = []

let roomBotOptions = {}
let phoneNumberNamesMap = {}

let quitConferenceTimeout = undefined
let moderatorWhitelist = new Set()
let botId = undefined
let lastUserWhoExecutedCommand = undefined
let workerHeartbeatIntervalId = undefined

const options =
  //merged options
  {
    displayName: '🤖',
    soundboardDisplayName: '🎧🤖♫🎶',
    hosts: {
      anonymousdomain: 'guest.meet.jit.si',
      domain: 'meet.jit.si',
      muc: 'conference.meet.jit.si',
      focus: 'focus.meet.jit.si',
    },
    //focusUserJid: 'focus@auth.meet.jit.si',
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
    startAudioMuted: 1,
    startWithAudioMuted: true,
    startVideoMuted: 1,
    startWithVideoMuted: true,
    disableNS: false,
    audioQuality: { stereo: true },
    breakoutRooms: {
      hideAutoAssignButton: true,
    },
    //whiteboard: {
    //   enabled: true,
    //   collabServerBaseUrl: '',
    //},
    //useTurnUdp: true,
    serviceUrl: 'wss://meet.jit.si/xmpp-websocket?room=roomname',
    //websocketKeepAliveUrl: 'https://meet.jit.si/_unlock?room=roomname',
  }

let libJitsiMeetSrc = 'https://meet.jit.si/libs/lib-jitsi-meet.min.js'


const breakoutBaseName = 'Breakout-Raum #'

const customBreakouts = {
  ' AFK 🦗📞': false,
  ' vor die Tür 🚪': false,
  ' um die Ecke 📐': false,
  ' Fokustunnel 🚇': false,
  ' nebenan 🡆': false,
  ' ich fühl mich genervt 😠': false,
  ' dumme Fragen ❓': false,
  ' grober Unfug 💣': false,
  ' dumme Ideen 💡': false,
}

const breakoutInitCount = 0

const roomIDs = {
  test: 'ColouredSpicesExperienceLong',
}

const skipConfEvents = [
  'CONFERENCE_JOINED',
  'CONFERENCE_LEFT',
  'CONFERENCE_FAILED',
  'KICKED',
  'PARTICIPANT_KICKED',
  'MESSAGE_RECEIVED',
  'PRIVATE_MESSAGE_RECEIVED',
  'USER_JOINED',
  'USER_LEFT',
  'TRACK_ADDED',
  'TRACK_REMOVED',
  'USER_ROLE_CHANGED',
  'TRACK_MUTE_CHANGED',
  'ENDPOINT_STATS_RECEIVED',
  'DISPLAY_NAME_CHANGED',
  'LOBBY_USER_JOINED',
]

const workerMessages = {
  ADD_BOT: 'addBot',
  REMOVE_BOT: 'removeBot',
  BROADCAST_MESSAGE: 'broadcastMessage',
  SEND_MESSAGE: 'sendMessage',
  HEARTBEAT: 'heartbeat',
  FIND_USER: 'findUser',
}

const returnMessages = {
  ADD_BOT_RETURN: 'add_bot_return',
  BROADCAST_MESSAGE: 'broadcastMessage',
  SEND_MESSAGE: 'sendMessage',
  FIND_USER_RETURN: 'findUserReturn',
}

const wsMessages = {
  BROADCAST_MESSAGE: 'broadcastMessage',
  SEND_MESSAGE: 'sendMessage',
  ROOM_JOIN: 'roomJoin',
  ROOM_LEFT: 'roomLeft',
  ROOM_KICKED: 'roomKicked',
  ROOM_CLOSED: 'roomClosed',
}

document
  .querySelector('#clearLog')
  ?.addEventListener(
    'click',
    () => (document.querySelector('#log').textContent = '')
  )

let d = new Date()
log(d)


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
      } // Default case
  
      return roomIDs.main
    }
    window.open(
      `${window.location.pathname}?room=${getTargetRoom(isValue, isCustom, customInput)}`,
      '_blank'
    )
  }
  
  document.querySelector('#start_bot_button')?.addEventListener('click', openBot)