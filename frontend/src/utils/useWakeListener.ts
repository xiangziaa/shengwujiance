import { LocalRecognition, localAsrSupported } from './localAsr'
import { VOICE_SETTINGS_EVENT, VOICE_SETTINGS_KEY } from './voiceStorage'
import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { loadVoiceMappings, matchVoiceMapping, type VoiceMapping } from './voiceMappings'

// Keep the session alive across utterances; pause during playback to avoid speaker echo.
export function useWakeListener(enabled: boolean, busy: boolean, onMatch: (rule: VoiceMapping) => void, onDisable: () => void) {
  // Microphone permission does not grant speech autoplay permission. A fresh
  // document needs a real interaction before it can reliably speak a reply.
  const [activated, setActivated] = useState(() => navigator.userActivation?.hasBeenActive ?? false)
  const [settingsVersion, setSettingsVersion] = useState(0)
  const [listening, setListening] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const activate = () => setActivated(true)
  const callback = useRef(onMatch)
  const disable = useRef(onDisable)
  callback.current = onMatch
  disable.current = onDisable
  useEffect(() => {
    const refresh = () => setSettingsVersion(value => value + 1)
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || [VOICE_SETTINGS_KEY, 'bio-voice-mappings'].includes(event.key)) refresh()
    }
    window.addEventListener(VOICE_SETTINGS_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(VOICE_SETTINGS_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  useEffect(() => {
    loadVoiceMappings()
    if (activated) return
    const onInteraction = (event: Event) => { if (event.isTrusted) setActivated(true) }
    window.addEventListener('click', onInteraction, true)
    window.addEventListener('keydown', onInteraction, true)
    return () => {
      window.removeEventListener('click', onInteraction, true)
      window.removeEventListener('keydown', onInteraction, true)
    }
  }, [activated])
  useEffect(() => {
    setListening(false)
    setReconnecting(false)
    if (!enabled || busy || !activated) return
    const Recognition = localAsrSupported() ? LocalRecognition : undefined
    if (!Recognition) { disable.current(); return }
    let disposed = false
    let handled = false
    let timer: number | undefined
    let recognition: InstanceType<typeof Recognition> | undefined
    const start = () => {
      if (disposed) return
      handled = false
      recognition = new Recognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = false
      recognition.onstart = () => {
        if (!disposed) { setListening(true); setReconnecting(false) }
      }
      recognition.onresult = event => {
        if (disposed || handled) return
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) continue
          const rule = matchVoiceMapping(event.results[i][0]?.transcript ?? '')
          if (rule) { handled = true; recognition?.abort(); callback.current(rule); break }
        }
      }
      recognition.onerror = event => {
        if (disposed) return
        setListening(false)
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'local-asr-unavailable'].includes(event.error)) {
          disposed = true
          disable.current()
          message.error('请启动本地 ASR 服务（local-asr/start-local-asr.ps1），允许麦克风权限后重新开启语音唤醒。')
        } else if (event.error !== 'aborted') {
          setReconnecting(true)
        }
      }
      recognition.onend = () => {
        if (!disposed) { setListening(false); timer = window.setTimeout(start, 500) }
      }
      try { recognition.start() } catch { timer = window.setTimeout(start, 1000) }
    }
    start()
    return () => { disposed = true; window.clearTimeout(timer); recognition?.abort() }
  }, [enabled, busy, activated, settingsVersion])
  const needsActivation = enabled && !activated
  const label = !enabled ? '开启语音唤醒' : needsActivation ? '点击启用语音' : busy ? '语音唤醒已开启' : listening ? '持续监听中' : reconnecting ? '语音连接重试中' : '正在启动麦克风'
  return { needsActivation, activate, label, listening: enabled && activated && !busy && listening }
}
