import { LocalTtsStatus } from '../components/common/LocalTtsStatus'
import { useNavigate } from 'react-router-dom'
import { useWakeListener } from '../utils/useWakeListener'
import { DigitalHumanAvatar } from '../components/digital-human/DigitalHumanAvatar'
import { Button, Input, Tooltip, message } from 'antd'
import { Activity, AlertTriangle, Bot, ChevronRight, Ear, FlaskConical, Mic, MicOff, Send, Settings2, ShieldCheck, Sparkles, Square, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createLocalAnswer } from '../components/digital-human/DigitalHumanAssistant'
import { useAppStore } from '../store/useAppStore'
import { speakNaturalChinese } from '../utils/naturalSpeech'
import { loadVoiceMappings, resolveMappingVoice, type VoiceMapping } from '../utils/voiceMappings'
import { VOICE_SETTINGS_EVENT, VOICE_SETTINGS_KEY } from '../utils/voiceStorage'

type ScreenState = 'idle' | 'listening' | 'thinking' | 'speaking'
export function AiScreenPage() {
  const samples = useAppStore((state) => state.samples)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('您好，我是小安。可以向我询问今日检测数据、风险预警和复核任务。')
  const [screenState, setScreenState] = useState<ScreenState>('idle')
  const [sound, setSound] = useState(true)
  const [wakeEnabled, setWakeEnabled] = useState(true)
  const [voiceMappings, setVoiceMappings] = useState(loadVoiceMappings)
  const [activeMapping, setActiveMapping] = useState<string | null>(null)
  const manualMappings = voiceMappings.filter(rule => rule.enabled && rule.keyword.trim() && rule.text.trim())
  const navigate = useNavigate()
  const recognitionRef = useRef<InstanceType<NonNullable<typeof window.SpeechRecognition>> | null>(null)
  const cancelSpeechRef = useRef<(() => void) | null>(null)
  const answerTimerRef = useRef<number | null>(null)
  const highRisk = useMemo(() => samples.filter((sample) => sample.riskLevel.includes('高')).length, [samples])
  const pending = useMemo(() => samples.filter((sample) => sample.status.includes('复核')).length, [samples])

  useEffect(() => {
    const refresh = () => setVoiceMappings(loadVoiceMappings())
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

  useEffect(() => () => {
    recognitionRef.current?.abort()
    cancelSpeechRef.current?.()
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current)
  }, [])

  const ask = (value = question) => {
    const text = value.trim()
    if (!text || screenState === 'thinking') return
    recognitionRef.current?.abort()
    recognitionRef.current = null
    cancelSpeechRef.current?.()
    setQuestion('')
    setActiveMapping(null)
    setScreenState('thinking')
    {
      answerTimerRef.current = null
      const reply = createLocalAnswer(text, samples.length, highRisk, pending)
      setAnswer(reply)
      if (!sound) { setScreenState('idle'); return }
      cancelSpeechRef.current = speakNaturalChinese(reply, {
        onStart: () => setScreenState('speaking'), onEnd: () => setScreenState('idle'), onError: error => { setScreenState('idle'); message.error(error) },
      })
    }
  }

  const playMapping = (rule: VoiceMapping, manual = false) => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onresult = null; recognition.onerror = null; recognition.onend = null
      recognition.abort()
    }
    cancelSpeechRef.current?.()
    setActiveMapping(null)
    if (manual && activeMapping === rule.id) { setScreenState('idle'); return }
    setAnswer(rule.text)
    if (!manual && !sound) { setScreenState('idle'); return }
    if (manual) setSound(true)
    setActiveMapping(rule.id)
    setScreenState('thinking')
    const finish = () => { setScreenState('idle'); setActiveMapping(null) }
    cancelSpeechRef.current = speakNaturalChinese(rule.text, {
      onStart: () => setScreenState('speaking'), onEnd: finish,
      onError: error => { finish(); message.error(error) },
    }, resolveMappingVoice(rule))
  }

  const wake = useWakeListener(wakeEnabled, screenState !== 'idle', rule => playMapping(rule), () => setWakeEnabled(false))

  const toggleWake = () => {
    if (wake.needsActivation) { wake.activate(); return }
    if (!wakeEnabled && !(window.SpeechRecognition ?? window.webkitSpeechRecognition)) {
      message.warning('当前浏览器不支持语音唤醒，请使用 Chrome 或 Edge。')
      return
    }
    const next = !wakeEnabled
    setWakeEnabled(next)
    message.success(next ? '持续监听已开启，匹配关键词后自动播报' : 'AI 大屏语音唤醒已关闭')
  }

  const toggleListening = () => {
    if (screenState === 'listening') {
      recognitionRef.current?.abort(); recognitionRef.current = null; setScreenState('idle'); return
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) { message.warning('当前浏览器不支持语音识别，请使用 Chrome 或 Edge。'); return }
    cancelSpeechRef.current?.()
    setActiveMapping(null)
    if (answerTimerRef.current !== null) { window.clearTimeout(answerTimerRef.current); answerTimerRef.current = null }
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'; recognition.interimResults = false; recognition.continuous = false
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim()
      recognition.abort(); recognitionRef.current = null
      if (text) ask(text)
    }
    recognition.onerror = () => { recognitionRef.current = null; setScreenState('idle') }
    recognition.onend = () => {
      if (recognitionRef.current === recognition) { recognitionRef.current = null; setScreenState('idle') }
    }
    recognitionRef.current = recognition; setScreenState('listening')
    try { recognition.start() } catch { recognitionRef.current = null; setScreenState('idle'); message.error('语音识别启动失败，请检查麦克风权限。') }
  }

  const toggleSound = () => {
    cancelSpeechRef.current?.(); setSound((current) => !current)
    setActiveMapping(null)
    if (screenState === 'speaking' || screenState === 'thinking') setScreenState('idle')
  }

  const stateText = { idle: '待命', listening: '正在聆听', thinking: '正在分析', speaking: '自然语音播报中' }[screenState]

  return (
    <div className={`ai-screen is-${screenState}`}>
      <div className="ai-screen-atmosphere" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="ai-screen-header">
        <div className="ai-screen-brand"><span><Sparkles size={20} /></span><div><strong>粮安智检 AI 大屏</strong><small>BIOTECH INTELLIGENCE CENTER</small></div></div>
        <div className="ai-screen-header-tools"><LocalTtsStatus />
          <button className="ai-screen-settings" onClick={() => navigate('/voice-settings', { state: { from: '/ai-screen' } })} aria-label="小安设置"><Settings2 size={17} /><span>小安设置</span></button>
          <button className={`ai-screen-wake ${wakeEnabled ? 'active' : ''}`} onClick={toggleWake} aria-label={wake.needsActivation ? wake.label : wakeEnabled ? '关闭AI大屏语音唤醒' : '开启AI大屏语音唤醒'}><Ear size={17} /><span>{wake.label}</span></button>
          <div className="ai-screen-clock"><i /><span>{stateText}</span></div>
        </div>
      </header>
      <aside className="ai-screen-metrics">
        <div><FlaskConical size={19} /><span>今日检测<b>128</b><small>份</small></span></div>
        <div><AlertTriangle size={19} /><span>风险预警<b>{highRisk}</b><small>项</small></span></div>
        <div><ShieldCheck size={19} /><span>待复核<b>{pending}</b><small>份</small></span></div>
      </aside>
      <section className="ai-screen-manual" aria-label="手动语音播报">
        <h2><Volume2 size={15} />手动播报</h2>
        <div className="ai-screen-manual-list">
          {manualMappings.map(rule => {
            const characters = Array.from(rule.keyword.trim())
            const title = characters.slice(0, 8).join('') + (characters.length > 8 ? '…' : '')
            const active = activeMapping === rule.id
            return <Tooltip key={rule.id} title={rule.keyword} placement="right"><button className={active ? 'is-active' : ''} aria-label={`${active ? '停止' : '播报'}：${rule.keyword}`} aria-pressed={active} onClick={() => playMapping(rule, true)}><span>{title}</span>{active ? <Square size={14} /> : <Volume2 size={14} />}</button></Tooltip>
          })}
          {!manualMappings.length && <div className="ai-screen-manual-empty"><p>暂无已启用的关键词播报</p><button onClick={() => navigate('/voice-settings', { state: { from: '/ai-screen' } })}>添加关键词映射<ChevronRight size={14} /></button></div>}
        </div>
      </section>
      <main className="ai-screen-human-wrap">
        <div className="ai-screen-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div className="ai-screen-state"><Activity size={15} /><span>{stateText}</span></div>
        <DigitalHumanAvatar speaking={screenState === 'speaking'} />
        <div className="ai-screen-name"><strong>小安</strong><span>生物检测智能助手</span></div>
      </main>
      <section className="ai-screen-dialog" aria-live="polite"><span><Bot size={18} /></span><p>{answer}</p></section>
      <div className="ai-screen-shortcuts">
        {['查看高风险预警', '今日待复核任务', '介绍检测流程', '查看样本总数', '如何生成检测报告'].map((item) => <button key={item} onClick={() => ask(item)}>{item}<ChevronRight size={14} /></button>)}
      </div>
      <footer className="ai-screen-console">
        <button className={`ai-screen-mic ${screenState === 'listening' ? 'active' : ''}`} onClick={toggleListening} aria-label={screenState === 'listening' ? '停止语音识别' : '开始语音识别'}>{screenState === 'listening' ? <MicOff /> : <Mic />}</button>
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} onPressEnter={() => ask()} placeholder={screenState === 'listening' ? '正在聆听，请开始说话…' : '输入检测问题，或点击麦克风语音提问'} aria-label="AI大屏提问" />
        <Button type="primary" icon={<Send size={20} />} onClick={() => ask()} disabled={!question.trim()} aria-label="发送问题" />
        <button className="ai-screen-sound" onClick={toggleSound} aria-label={sound ? '关闭语音播报' : '开启语音播报'}>{sound ? <Volume2 /> : <VolumeX />}</button>
      </footer>

    </div>
  )
}
