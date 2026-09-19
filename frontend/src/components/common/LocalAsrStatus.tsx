import { Button, Tag } from 'antd'
import { useLocalAsr } from '../../utils/useLocalAsr'
import { localAsrSupported } from '../../utils/localAsr'

export function LocalAsrStatus() {
  const asr = useLocalAsr()
  const label = { checking: '正在检测本地识别', connected: '本地识别已连接', disconnected: '本地识别未连接' }[asr.status]
  return <section className="local-tts-status details local-asr-status" aria-label="语音识别服务">
    <strong>语音识别 · ASR</strong>
    <span role="status" aria-live="polite"><Tag color={asr.status === 'connected' ? 'success' : asr.status === 'disconnected' ? 'error' : 'processing'}>{label}</Tag></span>
    <Button loading={asr.checking} onClick={() => void asr.refresh()}>重新检测识别服务</Button>
    <div>
      {asr.health ? <>
        <p>当前模型：{asr.health.model} · 中文离线识别 · {asr.health.sampleRate / 1000} kHz</p>
        <p>关键词唤醒和麦克风提问均使用本机识别。说完停顿约 0.6 秒后识别，断网也可使用；播报时暂停监听，结束后自动恢复。</p>
      </> : <p>{asr.error || '正在检查识别服务和模型是否就绪…'}</p>}
      {!localAsrSupported() && <p role="alert">当前页面无法使用麦克风，请使用 Chrome 或 Edge，通过 HTTPS 或 localhost 打开。</p>}
      {asr.status === 'disconnected' && <p>在使用网页的这台电脑上运行 <code>local-asr/start-local-asr.ps1</code>，然后重新检测。首次安装运行 <code>local-asr/setup.ps1</code>。</p>}
      <p>每 15 秒自动检测连接。连接正常后，返回小安或 AI 大屏开启语音唤醒并允许麦克风。这里的连接检测不会开启录音。</p>
    </div>
  </section>
}
