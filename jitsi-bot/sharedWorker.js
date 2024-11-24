let worker = undefined

/**
 * Worker Functions
 */

function addBotReturn(data) {
  console.log('Execute ADD_BOT_RETURN')
  botId = data

  workerHeartbeatIntervalId = setInterval(
    postMessageToWorker,
    60000,
    workerMessages.HEARTBEAT,
    { roomName, botId }
  )
}

function sendMessageReturn(data) {
  const messageContent = data.messageContent
  const sourceRoomName = data.sourceRoomName
  room.sendMessage(`Message from Room ${sourceRoomName}: \n${messageContent}`)
}

function broadcastMessageReturn(data) {
  const messageContent = data.broadcastContent
  const sourceRoomName = data.sourceRoomName
  room.sendMessage(
    `Broadcast-Message from Room ${sourceRoomName}: \n${messageContent}`
  )
}

// map of return messages to functions
const workerReturnMap = {
  [returnMessages.ADD_BOT_RETURN]: addBotReturn,
  [returnMessages.BROADCAST_MESSAGE]: broadcastMessageReturn,
  [returnMessages.SEND_MESSAGE]: sendMessageReturn,
}

if (!!window.SharedWorker) {
  worker = new SharedWorker('worker.js')
  worker.port.onmessage = (e) => {
    const message = e.data.message
    const value = e.data.value

    if (workerReturnMap[message]) {
      workerReturnMap[message](value)
    } else {
      // its a message without handler, thus return message to last person who sent command.
      if (lastUserWhoExecutedCommand) {
        room.sendMessage(message, lastUserWhoExecutedCommand)
      }
    }
    console.log('Recieved Message from Worker:')
    console.log(e.data)
  }
}

function postMessageToWorker(message, data) {
  if (message !== workerMessages.HEARTBEAT) {
    console.log(`Sending Message to worker: \n`, message, '\n', data)
  }

  worker.port.postMessage([message, data])
}

window.addEventListener('beforeunload', (e) => {
  if (botId === undefined) {
    return
  }
  postMessageToWorker(workerMessages.REMOVE_BOT, { roomName, botId })
})

function fuzzyFindUser(name) {
  name = name.toLowerCase().replaceAll(' ', '')
  let usernames = p.map((userObj) =>
    userObj._displayName.toLowerCase().replaceAll(' ', '')
  )
  let highestMatchPoints = 0
  let highestMatchNames = []
  const matches = new Map(
    [...usernames].map((username) => [
      username,
      {
        searchstring: username,
        lastIndex: -1,
        points: 0,
      },
    ])
  ) // [username, {searchstring, lastIndex, points}]
  // searchstring will be removed a letter for each found letter
  // lastIndex helps identifying better matches. - if lastIndex is newly found index, award 2 points as the match is in order
  for (const letter of name) {
    for (const [username, searchObj] of matches.entries()) {
      let index = searchObj.searchstring.indexOf(letter)
      let points = 0

      if (index == -1) {
        matches[username].lastIndex = -1
        continue
      }

      if (index == searchObj.lastIndex) {
        //consecutive match. Next letter in word matches. Double points.
        points = 2
      } else {
        points = 1
      }

      searchObj.lastIndex = index
      searchObj.points = searchObj.points + points
      searchObj.searchstring.replace(letter, '') // removes the first match of the letter == indexOf(letter)

      matches.set(username, searchObj)
    }
  }

  for (const [username, searchObj] of matches.entries()) {
    if (searchObj.points > highestMatchPoints) {
      highestMatchNames = [username]
      highestMatchPoints = searchObj.points
      continue
    }
    if (searchObj.points == highestMatchPoints) {
      highestMatchNames.push(username)
      continue
    }
  }

  console.log(matches)
  if (highestMatchPoints > name.length * 0.8) {
    return {
      match: true,
      names: highestMatchNames,
    }
  }
  return {
    match: false,
    names: [],
  }
}
