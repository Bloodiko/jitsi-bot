/**
 * Credit: Jimmi Music Bot for Jitsi https://github.com/Music-Bot-for-Jitsi/Jimmi
 */

const soundboard = document.querySelector('#soundboard')
const videoboard = document.querySelector('#videoboard')

soundboard.volume = 0.4
videoboard.volume = 0.4

let gainNode = undefined
let soundboardContext = undefined

let destStream = undefined

let initDone = false

async function initAudio() {

  let microphoneStream = await navigator.mediaDevices.getUserMedia({audio:true});

  let audioContext = new AudioContext()
  soundboardContext = audioContext

  let inputNode = audioContext.createMediaStreamSource(microphoneStream)

  destStream = audioContext.createMediaStreamDestination()

  inputNode.connect(destStream)

  log('InitAudio - Preparing Audio Stream')
  log(`AudioContext allowed: ${audioContext.state !== 'suspended'}`)

  let delayNode = audioContext.createDelay()

  delayNode.delayTime.value = 0.05 // 1000 ms 
  inputNode.connect(delayNode);
  delayNode.connect(destStream);

  let delayNode2 = audioContext.createDelay()
  delayNode2.delayTime.value = 0.05 // 1000 ms 
  delayNode.connect(delayNode2);
  delayNode2.connect(destStream);
  
  
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

  initDone = true;
}

document
  .querySelector('#setSoundboardSource')
  ?.addEventListener('click', () => {
    const soundboardSourceInput = document.querySelector(
      '#soundboardSourceInput'
    )
    if (!soundboardSourceInput.validity.valid) {
      return
    }
    soundboard.src = soundboardSourceInput.value
    soundboardSourceInput.value = ''
  })

initAudio()

function getSoundboardCurrentTrackName() {
  let splittedPath = new URL(soundboard.src).pathname.split('/')

  return splittedPath[splittedPath.length - 1].split('.')[0]
}
