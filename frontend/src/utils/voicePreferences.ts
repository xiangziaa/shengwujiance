import { readVoiceSetting } from './voiceStorage'

export const DEFAULT_SPEECH_RATE = 1
export const MIN_SPEECH_RATE = 0.7
export const MAX_SPEECH_RATE = 1.5
export const SPEECH_RATE_KEY = 'bio-voice-rate'

export function normalizeSpeechRate(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, value))
    : DEFAULT_SPEECH_RATE
}

export function loadSpeechRate(): number {
  try { return normalizeSpeechRate(JSON.parse(readVoiceSetting(SPEECH_RATE_KEY) ?? 'null')) }
  catch { return DEFAULT_SPEECH_RATE }
}

export const voiceStyles = [
  { id: 'bright', name: '活力轻快', description: '音调轻亮、语速自然', rate: DEFAULT_SPEECH_RATE, pitch: 1.18, voiceGroup: 'bright' },
] as const

export type VoiceStyleId = typeof voiceStyles[number]['id']
/** Which built-in voice pool a style draws from. */
export type VoiceGroup = typeof voiceStyles[number]['voiceGroup']

/** Fully specified speech settings after a mapping has been resolved. */
export interface VoicePreferences {
  style: VoiceStyleId
  voiceURI: string
  alertBeforeSpeech?: boolean
  /** Optional draft rate for settings previews; broadcasts use the saved global rate. */
  rate?: number
}

/** Built-in default: 活力轻快 with the device's default Chinese voice. */
export const defaultVoiceStyle: VoiceStyleId = 'bright'
export const defaultVoicePreferences: VoicePreferences = { style: defaultVoiceStyle, voiceURI: '' }

export const isVoiceStyleId = (value: unknown): value is VoiceStyleId =>
  voiceStyles.some((style) => style.id === value)

export function resolveVoiceStyle(id: unknown) {
  return voiceStyles.find((style) => style.id === id) ?? voiceStyles.find((style) => style.id === defaultVoiceStyle)!
}

/** Used only when no explicit per-message style has been selected. */
export function inferVoiceStyle(_text: string): VoiceStyleId {
  return 'bright'
}
