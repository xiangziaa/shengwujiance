import alertAudioUrl from '../assets/xiaoan-alert.wav'
import { loadGlobalVoice, normalizeGlobalVoice, loadSpeechRate, normalizeSpeechRate, defaultVoicePreferences, type VoicePreferences } from './voicePreferences'
import { TTS_URL } from './localTts'
interface NaturalSpeechHandlers { onStart?: () => void; onEnd?: () => void; onError?: (message: string) => void }
let activeCancel: (() => void) | undefined
export function speakNaturalChinese(text: string, handlers: NaturalSpeechHandlers = {}, preferences: VoicePreferences = defaultVoicePreferences) {
  activeCancel?.()
  const controller = new AbortController()
  let stopped = false
  let audio: HTMLAudioElement | undefined
  let url: string | undefined
  let finishAudio: (() => void) | undefined
  const timer = window.setTimeout(() => controller.abort(), 90000)
  const cleanup = () => {
    window.clearTimeout(timer); controller.abort()
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
      if (!text.trim()) { stopped = true; cleanup(); handlers.onEnd?.(); return }
      const normalized = text.replace(/qPCR/gi, '荧光定量聚合酶链式反应').replace(/ELISA/gi, '酶联免疫吸附检测').replace(/AI/gi, '人工智能').replace(/DON/gi, '呕吐毒素').replace(/ZEN/gi, '玉米赤霉烯酮')
      const response = await fetch(`${TTS_URL}/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ text: normalized, voice: preferences.previewVoiceURI === undefined ? loadGlobalVoice() : normalizeGlobalVoice(preferences.previewVoiceURI), rate: preferences.rate === undefined ? loadSpeechRate() : normalizeSpeechRate(preferences.rate) }),
      })
      if (!response.ok) throw new Error('本地 TTS 合成失败，请检查服务模型或重新选择本地声线。')
      if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('本地 TTS 返回格式异常，请重启服务。')
      const blob = await response.blob()
      if (stopped) return
      if (!blob.size) throw new Error('本地 TTS 未生成音频。')
      window.clearTimeout(timer)
      url = URL.createObjectURL(blob)
      handlers.onStart?.()
      if (preferences.alertBeforeSpeech) { try { await play(alertAudioUrl) } catch { /* Still deliver the spoken warning. */ } }
      if (stopped) return
      await play(url)
      if (!stopped) { stopped = true; cleanup(); handlers.onEnd?.() }
    } catch (reason) {
      if (!stopped) {
        stopped = true; cleanup()
        handlers.onError?.(reason instanceof Error && !['TypeError', 'AbortError'].includes(reason.name) ? reason.message : '无法连接本地 TTS 或合成超时，请启动本机服务并在小安设置中重新检测。')
      }
    }
  })()
  return cancel
}
