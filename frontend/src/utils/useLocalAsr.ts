import { useCallback, useEffect, useRef, useState } from 'react'
import { ASR_URL } from './localAsr'

interface AsrHealth { ready: true; model: string; offline: true; sampleRate: number }

export function useLocalAsr() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [health, setHealth] = useState<AsrHealth | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setChecking(true)
    const timer = window.setTimeout(() => controller.abort(), 4000)
    try {
      const response = await fetch(`${ASR_URL}/health`, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('本地 ASR 模型尚未就绪，请检查服务。')
      const data = await response.json()
      if (data.ready !== true || data.offline !== true || data.model !== 'paraformer-zh-small-onnx' || data.sampleRate !== 16000) {
        throw new Error('本地 ASR 服务版本不匹配，请重启项目的识别服务。')
      }
      if (request.current === controller) { setHealth(data); setStatus('connected'); setError('') }
    } catch (reason) {
      if (request.current === controller) {
        setHealth(null); setStatus('disconnected')
        setError(reason instanceof Error && reason.message.startsWith('本地 ASR') ? reason.message : '无法连接本机识别服务，请启动服务，并允许浏览器访问本地网络。')
      }
    } finally {
      window.clearTimeout(timer)
      if (request.current === controller) setChecking(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15000)
    return () => {
      window.clearInterval(timer)
      const pending = request.current; request.current = null; pending?.abort()
    }
  }, [refresh])
  return { status, health, error, checking, refresh }
}
