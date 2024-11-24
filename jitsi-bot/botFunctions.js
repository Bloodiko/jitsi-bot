/**
 *
 * Basic Bot functions
 */

function getStatUserByName(displayNameNormalized) {
  const statUserObj = room.getParticipants().find((user) => {
    if (
      user._displayName &&
      user._displayName.replace(' ', '').toLowerCase() === displayNameNormalized
    ) {
      return true
    }
    return false
  })

  return statUserObj?.getStatsID()
}

const getStatsIDById = (userId) => {
  return room.getParticipantById(userId)?._statsID
}

function loadAdminIDs() {
  let localStorageAdminWhitelist = JSON.parse(
    window.localStorage.getItem('adminWhitelist') || '{}'
  )

  if (localStorageAdminWhitelist.hasOwnProperty(roomName)) {
    moderatorWhitelist = new Set([
      ...moderatorWhitelist,
      ...localStorageAdminWhitelist[roomName],
    ])
  }
}

function saveAdminIDs() {
  loadAdminIDs()

  let localStorageAdminWhitelist = JSON.parse(
    window.localStorage.getItem('adminWhitelist') || '{}'
  )

  localStorageAdminWhitelist[roomName] = [...moderatorWhitelist]

  window.localStorage.setItem(
    'adminWhitelist',
    JSON.stringify(localStorageAdminWhitelist)
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
  let localStorageBanlist = JSON.parse(
    window.localStorage.getItem('banlist') || '{}'
  )

  let banlistRoom = localStorageBanlist.hasOwnProperty(roomName)
    ? localStorageBanlist[roomName]
    : [[], []]
  bannedUsers = banlistRoom[0]
  bannedStatUsers = banlistRoom[1]
}

function loadRoomOptions() {
  let localStorageRoomOptions = JSON.parse(
    window.localStorage.getItem('roomOptions') || '{}'
  )

  roomBotOptions = localStorageRoomOptions.hasOwnProperty(roomName)
    ? localStorageRoomOptions[roomName]
    : {}
}

function saveRoomOptions() {
  let localStorageRoomOptions = JSON.parse(
    window.localStorage.getItem('roomOptions') || '{}'
  )
  let mergedRoomOptions
  if (localStorageRoomOptions.hasOwnProperty(roomName)) {
    mergedRoomOptions = {
      ...localStorageRoomOptions[roomName],
      ...roomBotOptions,
    }
  } else {
    mergedRoomOptions = { ...roomBotOptions }
  }
  localStorageRoomOptions[roomName] = mergedRoomOptions

  window.localStorage.setItem(
    'roomOptions',
    JSON.stringify(localStorageRoomOptions)
  )
}

function loadPhoneNumberNameMap() {
  let tempPhoneMap = JSON.parse(
    window.localStorage.getItem('phoneNumbersNamesMap') || '{}'
  )
  phoneNumberNamesMap = { ...tempPhoneMap, ...phoneNumberNamesMap }
}

function savePhoneNumberNameMap() {
  loadPhoneNumberNameMap()

  window.localStorage.setItem(
    'phoneNumbersNamesMap',
    JSON.stringify(phoneNumberNamesMap)
  )
}

function sendMattermostNotificationToWebhook(webhookId, body) {
  fetch(`https://mattermost.com/hooks/${webhookId}`, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(body),
  })
}

function printParticipants() {
  const participants = room.getParticipants()
  const html_participantsInner = document.querySelector('#participantsInner')

  html_participantsInner.innerHTML = ''

  participants.forEach((participant) => {
    const part_element = document.createElement('div')
    part_element.textContent = `${participant.getStatsID()}: ${participant._displayName.replaceAll(
      / +/g,
      ' '
    )} ${participant.isModerator() ? '👑' : ''}`
    participant.isModerator() && part_element.classList.add('isModerator')
    part_element.classList.add('participant')
    html_participantsInner.append(part_element)
  })
}

function printPhoneNameOrIdentifyNumber(displayNameNormalized, event) {
  if (!phoneNumberNamesMap.hasOwnProperty(displayNameNormalized)) {
    if (event == JitsiMeetJS.events.conference.USER_LEFT) {
      // unknown phone numer left. ignore to not spam room unnecessary.
      return
    }
    room.sendMessage(
      `Unknown Phone number ${displayNameNormalized} detected. Please Identify with /identifyNumber PHONENUMBER NAME`
    )
    return
  }

  if (event == JitsiMeetJS.events.conference.USER_LEFT) {
    room.sendMessage(
      `${phoneNumberNamesMap[displayNameNormalized]} - ${displayNameNormalized} left the conference via telephone.`
    )
  }

  if (event == JitsiMeetJS.events.conference.USER_JOINED) {
    room.sendMessage(
      `${phoneNumberNamesMap[displayNameNormalized]} - ${displayNameNormalized} joined via telephone.`
    )
  }
}

function initMidnightReload() {
  // reload Room at midnight, to clear chat.

  const now = new Date()
  const midnight = new Date(now).setHours(24, 0, 0, 0)

  window.dailyReloadTimeout = setTimeout(() => {
    log('Reloading Bot - Midnight!')
    try {
      room.end()
      reloadBot('system')
    } catch (error) {
      log(error)
      // in case bot is not connected at the time of reload by dropping connection - force reload after 10 seconds
      setTimeout(window.location.reload, 10000)
    }
  }, midnight - now)
  console.log('Delay for reload at Midnight DEBUG: ', midnight - now)
}

function checkBreakout() {
  if (!roomJoined) {
    setTimeout(checkBreakout, 3000)
    return
  }

  let breakoutStatus = needBreakout()

  while (breakoutStatus.breakoutCounter < breakoutInitCount) {
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

const getNameById = (userId) => {
  return room.getParticipantById(userId)?._displayName
}

function needBreakout() {
  console.log('Checking Breakout Rooms. If not 3, create 3.')
  if (!breakout) {
    breakout = room.getBreakoutRooms()
  }

  let breakoutCounter = 0

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

function cleanupOnRoomLeft() {
  roomJoined = false
  clearInterval(workerHeartbeatIntervalId)
  workerHeartbeatIntervalId = undefined

  if (ws.readyState === ws.OPEN) {
    ws.send(
      JSON.stringify({
        type: wsMessages.ROOM_LEFT,
        param: {
          roomName,
        },
      })
    )
  }
}
