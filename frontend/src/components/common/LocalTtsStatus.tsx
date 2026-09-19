import { Button, Tag } from 'antd'
import { useLocalTts } from '../../utils/useLocalTts'
export function LocalTtsStatus({ details = false }: { details?: boolean }) {
  const tts = useLocalTts()
  const label = { checking: '正在检测本地语音', connected: '本地语音已连接', disconnected: '本地语音未连接' }[tts.status]
  return <div className={details ? 'local-tts-status details' : 'local-tts-status'}>
    <span role="status" aria-live="polite"><Tag color={tts.status === 'connected' ? 'success' : tts.status === 'disconnected' ? 'error' : 'processing'}>{label}</Tag></span>
    <Button size="small" loading={tts.status === 'checking'} onClick={() => void tts.refresh()}>重新检测</Button>
    {details && <div><p>{tts.status === 'connected' ? `已连接本地服务，可用 ${tts.voices.length} 个助手声线。默认使用 Vivian；已生成的文件可直接播放，新增或修改语音需要启动对应模型服务。` : tts.error || '正在检查服务和模型是否就绪…'}</p>
    <p>服务地址：127.0.0.1:8765 · 在使用网页的这台电脑上运行 local-tts/start-local-tts.ps1。预生成 Vivian 时还需运行 local-tts/start-qwen.ps1；已有文件仅需主服务即可播放。服务断开会提示，不会切换在线或系统声线。</p></div>}
  </div>
}
