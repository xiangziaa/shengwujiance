import alertAudioUrl from '../assets/xiaoan-alert.wav'
import { defaultVoicePreferences, type VoicePreferences } from './voicePreferences'
import { readAudioFile } from './audioFiles'
interface NaturalSpeechHandlers { onStart?: () => void; onEnd?: () => void; onError?: (message: string) => void }
let activeCancel: (() => void) | undefined
export function speakNaturalChinese(_text: string, handlers: NaturalSpeechHandlers = {}, preferences: VoicePreferences = defaultVoicePreferences) {
  activeCancel?.()
  const controller = new AbortController()
  let stopped = false
  let audio: HTMLAudioElement | undefined
  let url: string | undefined
  let finishAudio: (() => void) | undefined
  const cleanup = () => {
    controller.abort()
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause() }
    finishAudio?.(); finishAudio = undefined
    if (url) { URL.revokeObjectURL(url); url = undefined }
    if (activeCancel === cancel) activeCancel = undefined
  }
  const cancel = () => { stopped = true; cleanup() }
  activeCancel = cancel
  const play = (source: string) => new Promise<void>((resolve, reject) => {
    audio = new Audio(source)
    finishAudio = resolve
    audio.onended = () => resolve()
    audio.onerror = () => reject(new Error('音频播放失败，请检查音频设备或重新试听。'))
    try { void audio.play().catch(() => reject(new Error('浏览器未允许播放声音，请点击播报按钮重试。'))) } catch { reject(new Error('无法播放音频。')) }
  })
  void (async () => {
    try {
      if (!preferences.audioId) {
        stopped = true; cleanup(); handlers.onEnd?.(); return
      }
      const blob = await readAudioFile(preferences.audioId)
      if (stopped) return
      url = URL.createObjectURL(blob)
      handlers.onStart?.()
      if (preferences.alertBeforeSpeech) { try { await play(alertAudioUrl) } catch { /* Still deliver the spoken warning. */ } }
      if (stopped) return
      await play(url)
      if (!stopped) { stopped = true; cleanup(); handlers.onEnd?.() }
    } catch (reason) {
      if (!stopped) {
        stopped = true; cleanup()
        handlers.onError?.(reason instanceof Error ? reason.message : '本地音频播放失败，请重新选择文件。')
      }
    }
  })()
  return cancel
}
