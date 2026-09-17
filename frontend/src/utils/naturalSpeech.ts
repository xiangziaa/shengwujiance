import alertAudioUrl from '../assets/xiaoan-alert.wav'
import { inferVoiceStyle, resolveVoiceStyle, loadSpeechRate, normalizeSpeechRate, type VoiceGroup, type VoicePreferences } from './voicePreferences'

interface NaturalSpeechHandlers {
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

// Prefer Mandarin voices appropriate to each broadcast style.
const voiceProfiles: Record<VoiceGroup, string[]> = {
  bright: [
    'Xiaoxiao', '晓晓', 'Tingting', 'Google 普通话', 'Google Mandarin',
    'Meijia', 'Sinji', 'Microsoft Yaoyao',
  ],
}


/**
 * Male Chinese voices in Microsoft's catalogue are named 云X (云扬/云健/云希/
 * 云龙…) or Kangkang. Matching the naming pattern is more reliable than a name
 * list, and avoids loose substrings such as /liang/ that also match "Chinese".
 */
const maleVoicePattern = /(^|[^a-z])(kangkang|[云雲][扬揚健希龙龍野泽哲枫夏])([^a-z]|$)/i
/** Female Chinese voices are named 晓X / 曉X or use the older Huihui/Yaoyao names. */
const femaleVoicePattern = /(^|[^a-z])(xiaoxiao|xiaoyi|xiaobei|xiaoni|huihui|yaoyao|meijia|tingting|sinji|[晓曉][晓伊北妮曼佳雨臻])([^a-z]|$)/i

export function isMaleChineseVoice(name: string) {
  return maleVoicePattern.test(name)
}

/**
 * Groups the voices actually installed on this device so the settings page can
 * offer 女声 / 男声 instead of one flat list.
 */
export function listChineseVoiceChoices(voices: SpeechSynthesisVoice[]) {
  const chinese = voices.filter((voice) => /^zh([-_]|$)/i.test(voice.lang))
  const female: SpeechSynthesisVoice[] = []
  const male: SpeechSynthesisVoice[] = []
  const other: SpeechSynthesisVoice[] = []
  for (const voice of chinese) {
    if (isMaleChineseVoice(voice.name)) male.push(voice)
    else if (femaleVoicePattern.test(voice.name)) female.push(voice)
    else other.push(voice)
  }
  return { female, male, other }
}

/**
 * Voice names from browser engines are not normalised: Google ships
 * "Google\u00a0普通话（中国大陆）" with a non-breaking space, so a plain
 * includes('Google 普通话') never matches. Collapse every Unicode space before
 * comparing, otherwise a voice silently falls back to an unrelated one.
 */
const normalizeVoiceName = (name: string) => name.replace(/[\s\u00a0\u3000]+/g, ' ').trim().toLowerCase()

function selectNaturalChineseVoice(voices: SpeechSynthesisVoice[], group: VoiceGroup = 'bright') {
  const chinese = voices.filter((voice) => /^zh([-_]|$)/i.test(voice.lang))
  const mandarin = chinese.filter(voice => !/^zh[-_](HK|MO|yue)/i.test(voice.lang))
  const chineseVoices = mandarin.length ? mandarin : chinese
  const matchProfile = (names: string[]) =>
    names
      .map((name) => chineseVoices.find((voice) => normalizeVoiceName(voice.name).includes(normalizeVoiceName(name))))
      .find(Boolean)
  const byProfile = matchProfile(voiceProfiles[group])
  if (byProfile) return byProfile
  // Fall back to the other profile, then to any local Chinese voice, so a style
  // still produces speech on devices with an unusual voice list.
  return matchProfile(voiceProfiles.bright) ?? chineseVoices.find((voice) => voice.localService) ?? chineseVoices[0]
}

function splitForNaturalSpeech(text: string) {
  const normalized = text
    .replace(/AI/gi, '人工智能')
    .replace(/qPCR/gi, '荧光定量聚合酶链式反应')
    .replace(/ELISA/gi, '酶联免疫吸附检测')
    .replace(/DON/gi, '呕吐毒素')
    .replace(/ZEN/gi, '玉米赤霉烯酮')
  return [normalized.trim()].filter(Boolean)
}

export function speakNaturalChinese(text: string, handlers: NaturalSpeechHandlers = {}, preferences: VoicePreferences = { style: inferVoiceStyle(text), voiceURI: '' }) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    handlers.onEnd?.()
    return () => undefined
  }
  let cancelled = false
  let alertAudio: HTMLAudioElement | undefined
  const synthesis = window.speechSynthesis
  const chunks = splitForNaturalSpeech(text)
  const rate = preferences.rate === undefined ? loadSpeechRate() : normalizeSpeechRate(preferences.rate)
  const run = (index: number, voices: SpeechSynthesisVoice[]) => {
    if (cancelled) return
    if (index >= chunks.length) { handlers.onEnd?.(); return }
    const utterance = new SpeechSynthesisUtterance(chunks[index])
    const style = resolveVoiceStyle(preferences.style)
    const voice = voices.find(v => v.voiceURI === preferences.voiceURI && /^zh([-_]|$)/i.test(v.lang)) ?? selectNaturalChineseVoice(voices, style.voiceGroup)
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang || 'zh-CN'
    utterance.rate = rate
    utterance.pitch = style.pitch
    utterance.volume = 1
    utterance.onboundary = () => { if (!cancelled) window.dispatchEvent(new Event('xiaoan-speech-boundary')) }
    utterance.onstart = () => { if (index === 0 && !cancelled && !preferences.alertBeforeSpeech) handlers.onStart?.() }
    utterance.onerror = () => { if (!cancelled) handlers.onError?.() }
    utterance.onend = () => {
      if (!cancelled) run(index + 1, voices)
    }
    synthesis.speak(utterance)
  }
  synthesis.cancel()
  let speechStarted = false
  const startSpeech = () => {
    if (cancelled || speechStarted) return
    speechStarted = true
    if (alertAudio) {
      alertAudio.onended = null
      alertAudio.onerror = null
      alertAudio.pause()
    }
    run(0, synthesis.getVoices())
  }
  if (preferences.alertBeforeSpeech && chunks.length) {
    // Mark the entire alert + speech sequence busy so wake listening stays paused.
    handlers.onStart?.()
    alertAudio = new Audio(alertAudioUrl)
    alertAudio.onended = startSpeech
    // If audio cannot play, still deliver the spoken message.
    alertAudio.onerror = startSpeech
    try { void alertAudio.play().catch(startSpeech) } catch { startSpeech() }
  } else startSpeech()
  return () => {
    cancelled = true
    if (alertAudio) {
      alertAudio.onended = null
      alertAudio.onerror = null
      alertAudio.pause()
      alertAudio.currentTime = 0
    }
    synthesis.cancel()
  }
}
