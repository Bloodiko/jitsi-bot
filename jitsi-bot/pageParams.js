const checkRoomParam = (urlParams) => {
  // get page Parameter room

  const targetJitsi = urlParams.get('targetJitsi') || undefined

  if (!targetJitsi) {
    log('No targetJitsi Parameter, not launching bot.')
    return false
  }
  try {
    console.log('targetJitsi:', targetJitsi)
    const targetJitsiUrl = new URL(targetJitsi)
    console.log('targetJitsiUrl:', targetJitsiUrl)

    // pathname includes the first /
    const targetRoom = targetJitsiUrl.pathname.split('/')[1] || undefined

    if (!targetRoom) {
      log('No room Parameter in targetJitsi URL, not launching bot.')
      return false
    }
    roomName = targetRoom.replace(' ', '').toLowerCase()
  } catch (error) {
    log('Invalid targetJitsi URL.', LOGCLASSES.BOT_INTERNAL_LOG)
    return false
  }

  return true
}

const checkUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search)

  if (!checkRoomParam(urlParams)) {
    return false
  }

  return true
}

const mountConfInit = () => {
  if (!window.JitsiMeetJS) {
    setTimeout(mountConfInit, 1000)
    return
  }
  log('JitsiMeetJS loaded')
  document.querySelector('#confInit').src = 'conferenceInit.js'
}

const mergeConfig = () => {
  if (checkUrlParams()) {
    if (!window.config) {
      setTimeout(mergeConfig, 1000)
      return
    }

    // merge global config object with options
    options = {
      ...config,
      ...options,
    }

    if (options.bosh) {
      options.serviceUrl = `https://${options.bosh}/http-bind?room=${roomName}`
    } 
    // mount libJitsiMeet
    log('Mounting libJitsiMeet from ' + libJitsiMeetSrc)
    document.querySelector('#libJitsiMeet').src = libJitsiMeetSrc

    // mount conferenceInit
    mountConfInit()
  }
}

const initConfigAndLib = () => {
  const url = new URL(window.location.href)

  if (url.searchParams.has('targetJitsi')) {
    try {
      const targetJitsi = new URL(url.searchParams.get('targetJitsi'))
      if (targetJitsi) {
        // add domain to options
        options.targetJitsi = targetJitsi
        const targetJitsiConfig = `https://${targetJitsi.hostname}/config.js`
        
        document.querySelector(
          '#jitsiConfig'
        ).src = targetJitsiConfig
        log('Mounting config from ' + targetJitsiConfig)
        libJitsiMeetSrc = `https://${targetJitsi.hostname}/libs/lib-jitsi-meet.min.js`
      } else {
        log('No targetJitsi URL provided')
        return
      }
    } catch (error) {
      console.error('Error parsing targetJitsi URL:', error)
      log('Invalid targetJitsi URL.', LOGCLASSES.BOT_INTERNAL_LOG)
    }
    mergeConfig()
  }
  else {
    log('No targetJitsi URL provided. Please enter a conference room (including domain) in the corresponding field.')
    return
  }
}

initConfigAndLib()
