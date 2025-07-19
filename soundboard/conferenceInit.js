// soundboard should already be defined

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR)

JitsiMeetJS.init(options)

/**
 * Handles local tracks.
 * @param tracks Array with JitsiTrack objects
 */
function onLocalTracks({ type, tracks }) {
  localTracks[type] = tracks
  console.log(tracks)
  for (let i = 0; i < localTracks[type].length; i++) {
    localTracks[type][i].addEventListener(
      JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
      () => {
        console.log(`local ${localTracks[type][i].getType()} track muted`)
      }
    )
    localTracks[type][i].addEventListener(
      JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
      () => {
        console.log(
          `local ${localTracks[type][i].getType()} track stopped - disposing...`
        )
        localTracks[type][i].dispose()
      }
    )
    localTracks[type][i].addEventListener(
      JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
      (deviceId) =>
        console.log(`track audio output device was changed to ${deviceId}`)
    )
    if (roomJoined) {
      room.addTrack(localTracks[type][i])
    }
  }
}

/**
 * Handles remote tracks
 * @param track JitsiTrack object
 */
function onRemoteTrack(track) {
  return // we dont need remote audio and video tracks, so just do nothing here.
}

function initSoundboardTrack() {
  if (!initDone) {
    setTimeout(initSoundboardTrack, 2000)
    return
  }

  log('Initializing local audio Track(s).')
  // we also dont need local video stream, we just want the audio stream transmitted from the "audio soundboard" html element
  JitsiMeetJS.createLocalTracks({ devices: ['audio'] })
    .then((tracks) => {
      onLocalTracks({ type: 'audio', tracks })
    })
    .catch((error) => {
      throw error
    })
}

function initVideoboardTrack() {
  console.log('Initializing local video Track(s).')
  JitsiMeetJS.createLocalTracks({ devices: ['video'] })
    .then((tracks) => {
      onLocalTracks({ type: 'video', tracks })
    })
    .catch((error) => {
      throw error
    })
}

soundboard.addEventListener('play', () => {
  room.setDisplayName(
    `▶ ${getSoundboardCurrentTrackName()} - ${options.soundboardDisplayName}`
  )
})

soundboard.addEventListener('ended', () => {
  room.setDisplayName(
    `⏹ ${getSoundboardCurrentTrackName()} - ${options.soundboardDisplayName}`
  )
})

soundboard.addEventListener('pause', () => {
  room.setDisplayName(
    `⏸ ${getSoundboardCurrentTrackName()} - ${options.soundboardDisplayName}`
  )
})

// Video Related setup Stuff

function playVideo() {
  initVideoboardTrack()
  videoboard.play()
}

/* -------------------------
 * Command Handler Functions
 * -------------------------
 */

const reloadBot = (userId) => {
  // FIXME Needs fix for node ?
  room.sendMessage('Reloading Bot, see ya in a second. ')
  location.reload()
}

const unknownCommand = (userId) => {
  room.sendMessage('Command not found', userId)
}

const quit = (userId) => {
  room.sendMessage(`Soundbot leaving.`)
  room.room.doLeave()
  window.close()
}

const currentTrack = (userId) => {
  const track = soundboard.src
  room.sendMessage(`Currently loaded: ${track}`, userId)
}

const loadTrack = (userId, url) => {
  const mp3Reg = new RegExp('.*//.*.mp3')

  if (!mp3Reg.test(url)) {
    room.sendMessage('Invalid URL.', userId)
    return
  }

  try {
    soundboard.src = url
    room.sendMessage(`Source set.`, userId)
  } catch (error) {
    log(`Error on loading new source "${url}", check url.`)
  }
}

const play = () => {
  soundboard.play()
}

const pause = () => {
  soundboard.pause()
}

const toggleLoop = (userId) => {
  room.sendMessage(`Track Repeating set to ${!soundboard.loop}`, userId)
  soundboard.loop = !soundboard.loop
}

const increaseVol = (userId) => {
  soundboard.volume += 0.1
  room.sendMessage(`Volume set to ${soundboard.volume * 100}%`, userId)
}

const reduceVol = (userId) => {
  soundboard.volume -= 0.1
  room.sendMessage(`Volume set to ${soundboard.volume * 100}%`, userId)
}

const setVol = (userId, argument) => {
  const vol = parseFloat(argument)
  if (isNaN(vol)) {
    room.sendMessage(`Argument is NaN`, userId)
  }
  if (vol < 0 || vol > 100) {
    room.sendMessage(
      `Argument invalid. Please write Number between 0 and 100.`,
      userId
    )
  }

  soundboard.volume = vol / 100
  room.sendMessage(`Volume set to ${soundboard.volume * 100}%`, userId)
}

const togglePlayOnJoin = (userId) => {
  playJoinSound = !playJoinSound
  if (playJoinSound) {
    room.sendMessage(
      `OnJoinSound enabled (-Tea.mp3 needs to be set from host.)`,
      userId
    )
  } else {
    room.sendMessage(`OnJoinSound disabled.`, userId)
  }
}

const help = (userId) => {
  const commands = [
    'Available Commands:',
    '/currentTrack',
    '/help',
    '/loadTrack URL',
    '/pause',
    '/play',
    '/playVideo',
    '/reload',
    '/toggleLoop',
    '/vol+',
    '/vol-',
    '/setVol x # x: vol between 0 .. 100',
    '/quit',
    '/togglePlayOnJoin',
  ]

  room.sendMessage(commands.join('\n'), userId)
}

/* -----------------------------
 * Command Handler Functions End
 * -----------------------------
 */

const commandHandler = {
  '/currentTrack': currentTrack,
  '/help': help,
  '/loadTrack': loadTrack,
  '/pause': pause,
  '/play': play,
  '/playVideo': playVideo,
  '/reload': reloadBot,
  '/toggleLoop': toggleLoop,
  '/togglePlayOnJoin': togglePlayOnJoin,
  '/vol+': increaseVol,
  '/vol-': reduceVol,
  '/setVol': setVol,
  '/quit': quit,
}

function conferenceInit() {
  con = new JitsiMeetJS.JitsiConnection(null, null, options)

  const onConnectionSuccess = (ev) => {
    console.log('Connection Success')
    connectionEstablished = true
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

const getStatsIDById = (userId) => {
  return room.getParticipantById(userId)?._statsID
}

function roomInit() {
  if (!connectionEstablished) {
    setTimeout(roomInit, 1000)
    return
  }

  const onConferenceJoined = (ev) => {
    console.log('Conference Joined')

    bot_started = true
    roomJoined = true

    setTimeout(initSoundboardTrack, 2000)
  }

  room = con.initJitsiConference(roomName, options)

  room.addEventListener(
    JitsiMeetJS.events.conference.CONFERENCE_JOINED,
    onConferenceJoined
  )

  room.on(JitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
    roomJoined = false
  })

  room.on(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (userId, message) => {
    log(
      'Message received: \n' +
        (getNameById(userId) || getStatsIDById(userId) || userId) +
        ': ' +
        message,
      LOGCLASSES.PUBLIC_MESSAGE
    )
  })
  room.on(
    JitsiMeetJS.events.conference.PRIVATE_MESSAGE_RECEIVED,
    (userId, message) => {
      log(
        'Private Message recieved: \n' +
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

      try {
        commandHandler[command](userId, argument) // Executing corresponding function in commandHandler List.
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
    if (playJoinSound) {
      if (
        soundboard.src ==
        `${window.location.host}/audio/-Tea.mp3`
      ) {
        play()
      }
    }
    printParticipants()
    log('USER JOINED EVENT ' + userId + ': ' + userObj._displayName)
  })

  room.on(JitsiMeetJS.events.conference.USER_LEFT, (userId, userObj) => {
    log('USER LEFT EVENT ' + userId + ': ' + userObj._displayName)
    printParticipants()
    if (!remoteTracks[userId]) {
      return
    }
    const tracks = remoteTracks[id]

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].detach($(`#${id}${tracks[i].getType()}`))
    }
  })

  room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack)
  room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
    console.log(`track removed!!!${track}`)
  })

  room.on(JitsiMeetJS.events.conference.USER_ROLE_CHANGED, (userId, role) => {
    console.log(userId, ' Role Change: ', role)
    printParticipants()
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
    console.log(`${track}: ${track.getType()} - set to ${track.isMuted()}`)
  })
  room.on(
    JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
    (userID, displayName) => console.log(`${userID} - ${displayName}`)
  )
  room.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
    console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`)
  )

  room.on(
    JitsiMeetJS.events.conference._MEDIA_SESSION_ACTIVE_CHANGED,
    (jingle_session) => {
      if (jingle_session.peerconnection.localTracks.size === 0) {
        // add local track to peerconnection as its not being added yet.
        console.log('Adding local tracks to peerconnection. #jvbFix')
        for (let i = 0; i < localTracks.length; i++) {
          room.addTrack(localTracks[i])
        }
      }
    }
  )

  room.on(JitsiMeetJS.events.conference.KICKED, (kickedByUser, message) => {
    log(
      `\tI got kicked by ${kickedByUser._displayName}. \n\tReason: ${message}`,
      LOGCLASSES.MYSELF_KICKED
    )
  })

  room.setDisplayName(options.soundboardDisplayName)

  room.join()
}

function main() {
  if (bot_started) {
    return
  }

  document.title = 'Soundboard - ' + roomName

  conferenceInit()

  log('Target: ' + roomName)
  roomInit()
}

document.querySelector('#start_bot_button')?.addEventListener('click', openBot)
document
  .querySelector('#clearLog')
  ?.addEventListener(
    'click',
    () => (document.querySelector('#log').textContent = '')
  )

main()
