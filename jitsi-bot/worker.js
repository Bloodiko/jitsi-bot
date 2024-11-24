const workerMessages = {
  ADD_BOT: 'addBot',
  REMOVE_BOT: 'removeBot',
  BROADCAST_MESSAGE: 'broadcastMessage',
  SEND_MESSAGE: 'sendMessage',
  HEARTBEAT: 'heartbeat',
}

const returnMessages = {
  ADD_BOT_RETURN: 'add_bot_return',
  BROADCAST_MESSAGE: 'broadcastMessage',
  SEND_MESSAGE: 'sendMessage',
}

// Shared Web Worker JS

// bots: {roomName: {id: {port, roomName, heartbeat}}}  Hearbeat = Date.now()

let bots = new Map()

function postMessageToPort(port, data) {
  if (!data) {
    return
  }
  console.log(`Sending message to client port with data\n`, data)
  port.postMessage(data)
}

function addBot({ roomName }, port) {
  let botsInRoom = bots.get(roomName) || new Map()

  let idForNewBot = Date.now()

  botsInRoom.set(idForNewBot, { port, roomName, heartbeat: Date.now() })

  bots.set(roomName, botsInRoom)

  return { message: returnMessages.ADD_BOT_RETURN, value: idForNewBot }
}

function removeBot({ roomName, botId }) {
  console.log(botId)
  if (bots.get(roomName).has(botId)) {
    console.log(bots.get(roomName).delete(botId))
  }

  return
}

function broadcastMessage({ message, sourceRoomName }) {
  bots.forEach((botsInRoom, roomName) => {
    // only use first result of the iterator
    const port = botsInRoom.values().next().value?.port
    if (!port) {
      return
    }
    postMessageToPort(port, {
      message: returnMessages.BROADCAST_MESSAGE,
      value: { broadcastContent: message, sourceRoomName },
    })
  })
  return { message: `Broadcast dispatched.` }
}

function sendMessage({ message, roomName, sourceRoomName }) {
  const port = bots.get(roomName)?.values().next().value?.port

  if (!port) {
    return {
      message: `Unable to find bot in room. Cannot send message. Maybe the bot is run by another person?`,
    }
  }

  postMessageToPort(port, {
    message: returnMessages.SEND_MESSAGE,
    value: { messageContent: message, sourceRoomName },
  })
  return { message: `Send Message dispatched.` }
}

function heartbeat({ roomName, botId }, port) {
  const bot = bots.get(roomName).get(botId)

  if (!bot) {
    // Bot connection lost connection, but is restored.
    bots.get(roomName).set(botId, { port, roomName, heartbeat: Date.now() })
  }

  const botsInRoom = bots.get(roomName)

  botsInRoom.forEach((bot, botId, map) => {
    if (Date.now() - (bot.heartbeat || 0) > 180000) {
      // Hearbeat is supposed to be sent every 60000 ms = 60 sec = 1 min --> 180000 ms = 3 min timeout
      console.log(`Pruning dead Bot for room ${roomName}`)
      map.delete(botId) // pruning old bots
    }
  })

  bot.heartbeat = Date.now()
  return
}

// -----------------------------------------------

const messageMap = {
  [workerMessages.ADD_BOT]: addBot,
  [workerMessages.REMOVE_BOT]: removeBot,
  [workerMessages.BROADCAST_MESSAGE]: broadcastMessage,
  [workerMessages.SEND_MESSAGE]: sendMessage,
  [workerMessages.HEARTBEAT]: heartbeat,
}

onconnect = function (ev) {
  const port = ev.ports[0]

  port.onmessage = (ev) => {
    const message = ev.data[0]
    const args = ev.data[1]

    console.log('Message Recieved\n', message, '\n', args)

    try {
      const result = messageMap[message](args, port)
      postMessageToPort(port, result)
    } catch (error) {
      const result = { message: 'Error, see console.' }
      console.error(error)
      postMessageToPort(port, result)
    }
  }
}
