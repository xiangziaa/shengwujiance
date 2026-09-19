export const VOICE_SETTINGS_KEY = 'bio-xiaoan-settings-v2'
export const VOICE_SETTINGS_EVENT = 'xiaoan-settings-changed'

export function readVoiceSetting(key: string): string | null {
  const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
  if (raw) {
    const saved = JSON.parse(raw)
    if (saved && typeof saved === 'object' && key in saved) return JSON.stringify(saved[key])
  }
  return localStorage.getItem(key)
}

export function writeVoiceSetting(key: string, value: unknown) {
  const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
  if (raw) {
    const saved = JSON.parse(raw)
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify({ ...saved, [key]: value }))
  } else localStorage.setItem(key, JSON.stringify(value))
}

// Commit all settings in a single write: failure cannot leave a partial save.
export function saveVoiceSettings(mappings: unknown, rate?: number, voice?: string) {
  const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
  const saved = raw ? JSON.parse(raw) : {}
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify({ ...saved, 'bio-voice-mappings': mappings, ...(rate === undefined ? {} : { 'bio-voice-rate': rate }), ...(voice === undefined ? {} : { 'bio-voice-global': voice }) }))
  window.dispatchEvent(new Event(VOICE_SETTINGS_EVENT))
}
