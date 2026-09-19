import { useCallback, useEffect, useRef, useState } from 'react'
import { getLocalVoices, type LocalVoice } from './localTts'
export function useLocalTts() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [voices, setVoices] = useState<LocalVoice[]>([])
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setStatus('checking')
    const timer = window.setTimeout(() => controller.abort(), 4000)
    try {
      const available = await getLocalVoices(controller.signal)
      if (request.current === controller) { setVoices(available); setStatus('connected'); setError('') }
    } catch (reason) {
      if (request.current === controller) {
        setStatus('disconnected'); setVoices([])
        setError(reason instanceof Error && reason.message.startsWith('本地 TTS') ? reason.message : '无法连接本机服务。请启动服务，并允许浏览器访问本地网络。')
      }
    } finally { window.clearTimeout(timer) }
  }, [])
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15000)
    return () => { window.clearInterval(timer); const pending = request.current; request.current = null; pending?.abort() }
  }, [refresh])
  return { status, voices, error, refresh }
}
