const checkRoomParam = (urlParams) => {
  // get page Parameter room
  const targetRoom = urlParams.get('room')

  if (!targetRoom) {
    log('No room Parameter, not launching bot.')
    return false
  }
  roomName = targetRoom.replace(' ', '').toLowerCase()

  return true
}

const checkUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search)

  if (!checkRoomParam(urlParams)) {
    return false
  }

    // get useTurnUdp
    if (urlParams.has('useTurnUdp')) {
        options.useTurnUdp = useTurnUdp
    }

    // get domain
    let domain = urlParams.get('domain')
    if (!domain) {
        log('No domain Parameter, using default domain meet.jit.si.')
    } else {
        options.hosts.domain = domain
        options.hosts.muc = `conference.${domain}`
        options.hosts.focus = `focus.${domain}`
        options.hosts.anonymousdomain = `guest.${domain}`
        options.websocket = `wss://${domain}/xmpp-websocket`
        options.serviceUrl = `wss://${domain}/xmpp-websocket?room=${roomName}`

        // if domain is not meet.jit.si, use domain for libJitsiMeetSrc
        libJitsiMeetSrc = `https://${domain}/libs/lib-jitsi-meet.min.js`
    }

    // if bosh use bosh for serviceUrl
    let bosh = urlParams.get('bosh')?.replace('/', '') // remove leading slash if present
    if (bosh) {
        options.bosh = `https://${domain}/${bosh}`
        options.hosts.bosh = `https://${domain}/${bosh}`
        options.serviceUrl = `https://${domain}/${bosh}?room=${roomName}`
    }

    // get websocketKeepAliveUrl
    let websocketKeepAliveUrl = urlParams.get('wsKeepAlive')
    if (!websocketKeepAliveUrl && !domain) {
        log('No wsKeepAlive Parameter, using default wsKeepAlive from meet.jit.si.')
        options.websocketKeepAliveUrl = `https://meet.jit.si/_unlock?room=${roomName}`
    }
    if (websocketKeepAliveUrl && domain) {
        options.websocketKeepAliveUrl = `https://${domain}/${websocketKeepAliveUrl}`
    }

  return true
}

const mountConfInit = () => {
    if (!window.JitsiMeetJS) {
        setTimeout(mountConfInit, 1000)
        return
    }
    log('JitsiMeetJS loaded')
    document.querySelector("#confInit").src = window.location.pathname.replace("jitsi.html", "conferenceInit.js")
}

if (checkUrlParams()) {
    // mount libJitsiMeet
    log('Mounting libJitsiMeet from ' + libJitsiMeetSrc)
    document.querySelector("#libJitsiMeet").src = libJitsiMeetSrc 

    // mount conferenceInit
    mountConfInit()
}