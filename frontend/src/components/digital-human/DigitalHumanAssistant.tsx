import { LocalRecognition, localAsrSupported } from '../../utils/localAsr'
import { useDraggableAssistant } from '../../utils/useDraggableAssistant'
import { useWakeListener } from '../../utils/useWakeListener'
import { DigitalHumanAvatar } from './DigitalHumanAvatar'
import { Link, useLocation } from 'react-router-dom'
import { Button, Input, Tooltip, message } from 'antd'
import { Bot, Ear, Mic, MicOff, Send, Settings, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { speakNaturalChinese } from '../../utils/naturalSpeech'
import type { VoicePreferences } from '../../utils/voicePreferences'
import { resolveMappingVoice, type VoiceMapping } from '../../utils/voiceMappings'

type AssistantState = 'idle' | 'thinking' | 'speaking'
type AssistantDisplayState = AssistantState | 'listening'
type ChatMessage = { id: number; role: 'assistant' | 'user'; content: string }

const stateLabels: Record<AssistantDisplayState, string> = {
  idle: '待命', listening: '正在聆听', thinking: '正在分析', speaking: '正在播报',
}

export function createLocalAnswer(question: string, sampleCount: number, highRiskCount: number, pendingCount: number) {
  const value = question.trim()
  if (/生成.*报告/.test(value)) return '完成检测和人工复核后，可在 AI 综合判读页面点击生成报告，再前往报告中心查看、签字或导出检测报告。'
  if (/高风险|预警|异常/.test(value)) return `当前系统共有 ${highRiskCount} 个高风险样本。建议优先进入样本管理，按风险等级筛选并完成复核。`
  if (/待复核|复核/.test(value)) return `目前有 ${pendingCount} 个样本处于待复核状态。请先核对原始检测曲线、质控结果和样本批次信息。`
  if (/样本|检测量|多少/.test(value)) return `当前数据集中共有 ${sampleCount} 个样本记录。我可以继续帮你查询高风险样本或待复核任务。`
  if (/你好|您好|在吗/.test(value)) return '您好，我是生物检测智能助手小安。可以向我询问样本、风险预警、复核任务和检测流程。'
  if (/怎么|流程|操作/.test(value)) return '检测流程依次为样本登记、快速筛查、ELISA 或 qPCR 检测、AI 判读、人工复核和报告生成。'
  return '我已收到你的问题。当前演示环境使用本地检测数据，我可以回答样本数量、高风险预警、待复核任务和检测流程相关问题。'
}

export function DigitalHumanAssistant() {
  const location = useLocation()
  const samples = useAppStore((store) => store.samples)
  const [open, setOpen] = useState(false)
  const drag = useDraggableAssistant(open)
  const [sound, setSound] = useState(true)
  const [wakeEnabled, setWakeEnabled] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [input, setInput] = useState('')
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'assistant', content: '您好，我是生物检测智能助手小安。点击麦克风或输入问题即可开始。' },
  ])
  const recognitionRef = useRef<LocalRecognition | null>(null)
  const recognitionTimerRef = useRef<number | null>(null)
  const answerTimerRef = useRef<number | null>(null)
  const speechSessionRef = useRef(0)
  const cancelSpeechRef = useRef<(() => void) | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const nextIdRef = useRef(2)
  const highRiskCount = useMemo(() => samples.filter((sample) => sample.riskLevel.includes('高')).length, [samples])
  const pendingCount = useMemo(() => samples.filter((sample) => sample.status.includes('复核')).length, [samples])
  const displayState: AssistantDisplayState = isListening ? 'listening' : assistantState

  const clearRecognitionTimer = () => {
    if (recognitionTimerRef.current !== null) {
      window.clearTimeout(recognitionTimerRef.current)
      recognitionTimerRef.current = null
    }
  }

  const stopListening = () => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    clearRecognitionTimer()
    setIsListening(false)
    if (recognition) {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try { recognition.abort() } catch { recognition.stop() }
    }
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, assistantState])
  useEffect(() => () => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    clearRecognitionTimer()
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current)
    speechSessionRef.current += 1
    try { recognition?.abort() } catch { recognition?.stop() }
    cancelSpeechRef.current?.()
  }, [])

  const speak = (text: string, voice?: VoicePreferences) => {
    if (!sound) {
      setAssistantState('idle')
      return
    }
    const speechSession = ++speechSessionRef.current
    cancelSpeechRef.current?.()
    cancelSpeechRef.current = speakNaturalChinese(text, {
      onStart: () => { if (speechSessionRef.current === speechSession) setAssistantState('speaking') },
      onEnd: () => { if (speechSessionRef.current === speechSession) setAssistantState('idle') },
      onError: error => { if (speechSessionRef.current === speechSession) { setAssistantState('idle'); message.error(error) } },
    }, voice)
  }

  const submitQuestion = (rawQuestion = input) => {
    const question = rawQuestion.trim()
    if (!question || assistantState === 'thinking') return
    stopListening()
    speechSessionRef.current += 1
    cancelSpeechRef.current?.()
    setInput('')
    setMessages((current) => [...current, { id: nextIdRef.current++, role: 'user', content: question }])
    setAssistantState('thinking')
    {
      answerTimerRef.current = null
      const answer = createLocalAnswer(question, samples.length, highRiskCount, pendingCount)
      setMessages((current) => [...current, { id: nextIdRef.current++, role: 'assistant', content: answer }])
      speak(answer)
    }
  }

  const wake = useWakeListener(wakeEnabled, isListening || assistantState !== 'idle', (rule: VoiceMapping) => {
    setOpen(true)
    setMessages(current => [...current, { id: nextIdRef.current++, role: 'assistant', content: rule.text || `正在播放：${rule.keyword}` }])
    if (sound) setAssistantState('thinking')
    // A keyword mapping may pin its own speaker and style; otherwise it inherits 语音选项.
    speak(rule.text, resolveMappingVoice(rule))
  }, () => setWakeEnabled(false))

  const toggleWake = () => {
    if (wake.needsActivation) { wake.activate(); return }
    if (!wakeEnabled && !localAsrSupported()) {
      message.warning('当前浏览器不支持语音唤醒，请使用 Chrome 或 Edge。')
      return
    }
    const next = !wakeEnabled
    setWakeEnabled(next)
    message.success(next ? '持续监听已开启，匹配关键词后自动播报' : '语音唤醒已关闭')
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      return
    }
    const Recognition = localAsrSupported() ? LocalRecognition : undefined
    if (!Recognition) {
      message.warning('当前浏览器不支持语音识别，请使用 Chrome 或 Edge，或直接输入文字。')
      return
    }
    cancelSpeechRef.current?.()
    setAssistantState('idle')
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => {
      if (recognitionRef.current === recognition) setIsListening(true)
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      stopListening()
      if (transcript) submitQuestion(transcript)
    }
    recognition.onerror = (event) => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
        clearRecognitionTimer()
        setIsListening(false)
      }
      if (event.error !== 'aborted') message.error('语音识别失败，请确认本地 ASR 服务已启动并允许麦克风权限。')
    }
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
        clearRecognitionTimer()
        setIsListening(false)
      }
    }
    recognitionRef.current = recognition
    setIsListening(true)
    try {
      recognition.start()
      recognitionTimerRef.current = window.setTimeout(() => {
        if (recognitionRef.current === recognition) {
          stopListening()
          message.info('语音监听已超时，请重新点击麦克风提问。')
        }
      }, 20_000)
    } catch {
      stopListening()
      message.error('语音识别启动失败，请检查麦克风权限后重试。')
    }
  }

  const toggleSound = () => {
    setSound((current) => !current)
    speechSessionRef.current += 1
    cancelSpeechRef.current?.()
    if (assistantState === 'speaking') setAssistantState('idle')
  }

  const closeAssistant = () => {
    stopListening()
    if (answerTimerRef.current !== null) {
      window.clearTimeout(answerTimerRef.current)
      answerTimerRef.current = null
    }
    speechSessionRef.current += 1
    cancelSpeechRef.current?.()
    setAssistantState('idle')
    setOpen(false)
  }

  if (!open) {
    return (
      <div ref={drag.ref} style={drag.style} className={`digital-human-launcher-wrap ${drag.dragging ? 'is-dragging' : ''}`}>
        <button {...drag.handle} title="点击打开小安助手，拖动可移动位置，也可用方向键移动" className="digital-human-launcher" onClick={() => setOpen(true)} aria-label="打开小安助手">
          <DigitalHumanAvatar />
          <span><b>小安助手</b><small><i /> {wakeEnabled ? wake.label : '点击咨询'}</small></span>
          <Bot size={20} aria-hidden="true" />
        </button>
        <Tooltip title={wake.label} placement="left">
          <button className={`digital-human-wake-toggle ${wakeEnabled ? 'active' : ''}`} onClick={toggleWake} aria-label={wake.needsActivation ? wake.label : wakeEnabled ? '关闭语音唤醒' : '开启语音唤醒'}><Ear size={18} /></button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div ref={drag.ref} style={drag.style} className={`digital-human-panel is-${displayState} ${drag.dragging ? 'is-dragging' : ''}`} role="region" aria-label="小安助手">
      <div className="digital-human-stage">
        <div className="digital-human-stage-head">
          <span className="digital-human-status"><i />{stateLabels[displayState]}</span>
          <div className="digital-human-stage-tools"><Tooltip title="小安设置"><Link to="/voice-settings" state={{ from: location.pathname + location.search }} className="digital-human-icon-button" aria-label="小安设置"><Settings size={18} /></Link></Tooltip>
            <Tooltip title={wake.label}><button className={`digital-human-icon-button ${wakeEnabled ? 'active' : ''}`} onClick={toggleWake} aria-label={wake.needsActivation ? wake.label : wakeEnabled ? '关闭语音唤醒' : '开启语音唤醒'}><Ear size={18} /></button></Tooltip>
            <Tooltip title={sound ? '关闭语音播报' : '开启语音播报'}><button className="digital-human-icon-button" onClick={toggleSound} aria-label={sound ? '关闭语音播报' : '开启语音播报'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></Tooltip>
          </div>
        </div>
        <div className="digital-human-aura" aria-hidden="true" />
        <DigitalHumanAvatar className="digital-human-character" speaking={assistantState === 'speaking'} />
        <div className="digital-human-identity"><strong>小安</strong><span>生物检测智能助手</span></div>
        <div className="voice-visualizer" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
      </div>

      <div className="digital-human-chat">
        <header {...drag.handle} className="digital-human-drag-handle" tabIndex={0} aria-label="拖动移动小安助手，也可使用方向键" title="拖动标题栏可移动，方向键也可调整位置">
          <div><strong>小安助手</strong><span>样本 · 风险 · 复核 · 检测流程</span></div>
          <button className="digital-human-close" onClick={closeAssistant} aria-label="关闭数字人助手"><X size={19} /></button>
        </header>
        <div className="digital-human-messages" aria-live="polite">
          {messages.map((item) => (
            <div key={item.id} className={`digital-human-message ${item.role}`}>
              {item.role === 'assistant' && <span className="message-avatar"><Bot size={15} /></span>}
              <p>{item.content}</p>
            </div>
          ))}
          {assistantState === 'thinking' && <div className="digital-human-message assistant"><span className="message-avatar"><Bot size={15} /></span><p className="typing-dots"><i /><i /><i /></p></div>}
          <div ref={chatEndRef} />
        </div>
        <div className="digital-human-suggestions">
          {['查看高风险预警', '有多少待复核样本？', '介绍检测流程'].map((suggestion) => (
            <button key={suggestion} onClick={() => submitQuestion(suggestion)}>{suggestion}</button>
          ))}
        </div>
        <footer>
          <Tooltip title={isListening ? '停止聆听' : '语音提问'}>
            <button className={`digital-human-mic ${isListening ? 'active' : ''}`} onClick={toggleListening} aria-label={isListening ? '停止语音识别' : '开始语音识别'}>
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </Tooltip>
          <Input value={input} onChange={(event) => setInput(event.target.value)} onPressEnter={() => submitQuestion()} placeholder={isListening ? '正在聆听…' : '请输入检测相关问题'} disabled={assistantState === 'thinking'} aria-label="向数字人提问" />
          <Button type="primary" icon={<Send size={17} />} onClick={() => submitQuestion()} disabled={!input.trim() || assistantState === 'thinking'} aria-label="发送问题" />
        </footer>
        <small className="digital-human-disclaimer">回答基于当前演示数据，仅供检测工作辅助参考</small>
      </div>
    </div>
  )
}
