/**
 * Credit: Jimmi Music Bot for Jitsi https://github.com/Music-Bot-for-Jitsi/Jimmi
 */

const soundboard = document.querySelector('#soundboard')
const videoboard = document.querySelector('#videoboard')

soundboard.volume = 0.1
videoboard.volume = 0.1

let gainNode = undefined
let soundboardContext = undefined

let destStream = undefined

let initDone = false

let playJoinSound = true

function initAudio() {
  if (!soundboard) {
    console.error('Error with Soundboard Audio Element.')
  }

  const audioContext = new AudioContext()
  soundboardContext = audioContext
  const videoAudio = audioContext.createMediaElementSource(videoboard)
  const track = audioContext.createMediaElementSource(soundboard)
  destStream = audioContext.createMediaStreamDestination()

  videoAudio.connect(destStream)
  track.connect(destStream)

  log('InitAudio - Preparing Audio Stream')
  log(`AudioContext allowed: ${audioContext.state !== 'suspended'}`)
  navigator.mediaDevices.getUserMedia = async function ({ audio, video }) {
    console.log({ audio, video })
    log(
      'UserMedia is being Accessed. - Returning corresponding context stream.'
    )

    await audioContext.resume()
    if (audio) {
      return destStream.stream
    }
    if (video) {
      const videoStream = new MediaStream()
      videoStream.addTrack(videoboard.captureStream().getVideoTracks()[0])
      return videoStream
    }
    return destStream.stream
  }

  initDone = true
}

document
  .querySelector('#soundboardInputForm')
  ?.addEventListener('submit', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const soundboardSourceInput = document.querySelector(
      '#soundboardSourceInput'
    )
    if (!soundboardSourceInput.validity.valid) {
      return false
    }
    try {
      log(`Trying to load URL ${soundboardSourceInput.value}`)
      soundboard.src = soundboardSourceInput.value
      soundboardSourceInput.value = ''
    } catch (error) {
      console.log(error)
      log(`Error Loading Audofile.`)
    }
  })

initAudio()

function getSoundboardCurrentTrackName() {
  let splittedPath = new URL(soundboard.src).pathname.split('/')

  return splittedPath[splittedPath.length - 1].split('.')[0]
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
