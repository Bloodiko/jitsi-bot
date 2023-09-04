let con = null
let room = null
let connectionEstablished = false
let roomJoined = false
let roomName = ''

let bot_started = false
let roomInput = undefined

let breakout = null

const options =
  //merged options
  {
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
    //whiteboard: {
    //   enabled: true,
    //   collabServerBaseUrl: '',
    //},
    //useTurnUdp: true,
    serviceUrl: 'wss://meet.jit.si/xmpp-websocket?room=roomname',
    //websocketKeepAliveUrl: 'https://meet.jit.si/_unlock?room=roomname',
  }

let libJitsiMeetSrc = 'https://web-cdn.jitsi.net/meetjitsi_7499.4317/libs/lib-jitsi-meet.min.js?v=7499.4317'

let bannedUsers = []
let bannedStatUsers = []

let quitConferenceTimeout = undefined

let moderatorWhitelist = new Set()

const breakoutBaseName = 'Breakout-Raum #'

const roomIDs = {
  test: 'ColouredSpicesExperienceLong',
}

const logElement = document.querySelector('#log')

const log = (message) => {
  if (!logElement) {
    return
  }
  logElement.textContent += '\n' + message
  console.log(message)
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