import { saveVoiceSettings } from '../utils/voiceStorage'
import { defaultVoiceStyle, DEFAULT_SPEECH_RATE, MIN_SPEECH_RATE, MAX_SPEECH_RATE, loadSpeechRate } from '../utils/voicePreferences'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Switch, Empty, Select, Checkbox, message } from 'antd'
import { ArrowLeft, Plus, Save, Volume2, Square, Trash2, Info } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeading } from '../components/common/PageHeading'
import { SectionPanel } from '../components/common/SectionPanel'
import { loadVoiceMappings, convertKeywordNumbers, normalizeKeyword, resolveMappingVoice, type VoiceMapping } from '../utils/voiceMappings'
import { speakNaturalChinese, listChineseVoiceChoices } from '../utils/naturalSpeech'

export function VoiceSettingsPage() {
  const location = useLocation()
  const source = location.state?.from
  const returnTo = typeof source === 'string' && /^\/(dashboard|samples|screening|elisa|qpcr|analysis|reports|knowledge|settings|ai-screen)(?:[/?]|$)/.test(source) ? source : '/ai-screen'
  const [rules, setRules] = useState<VoiceMapping[]>(loadVoiceMappings)
  const [speechRate, setSpeechRate] = useState(loadSpeechRate)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const cancel = useRef<(() => void) | null>(null)

  useEffect(() => {
    const synthesis = window.speechSynthesis
    if (!synthesis) return
    // Edge populates getVoices() asynchronously and can answer with an empty or
    // partial list at first, so poll briefly until the voices settle.
    const read = () => synthesis.getVoices().filter(voice => /^zh([-_]|$)/i.test(voice.lang))
    let disposed = false
    let tries = 0
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      if (disposed) return
      const available = read()
      setVoices(available)
      if (++tries < 24 && available.length === 0) timer = window.setTimeout(refresh, 250)
    }
    refresh()
    synthesis.addEventListener('voiceschanged', refresh)
    return () => { disposed = true; window.clearTimeout(timer); synthesis.removeEventListener('voiceschanged', refresh) }
  }, [])
  useEffect(() => () => cancel.current?.(), [])

  const voiceOptions = useMemo(() => {
    const { female, male, other } = listChineseVoiceChoices(voices)
    const label = (name: string) => name.replace(/^Microsoft\s+/, '').replace(/\s+Online.*$/, '').replace(/\s+-\s+Chinese.*$/, '')
    const group = (title: string, list: SpeechSynthesisVoice[]) => list.length
      ? [{ label: title, options: list.map(voice => ({ value: voice.voiceURI, label: label(voice.name) })) }]
      : []
    return [
      { label: '自动匹配', options: [{ value: '', label: '按风格自动匹配声线（推荐）' }] },
      ...group('女声', female),
      ...group('男声', male),
      ...group('其他中文声音', other),
    ]
  }, [voices])

  const update = (id: string, change: Partial<VoiceMapping>) => setRules(rows => rows.map(row => row.id === id ? { ...row, ...change } : row))

  const stopPreview = () => { cancel.current?.(); cancel.current = null; setPreview(null) }

  const setAlert = (rule: VoiceMapping, checked: boolean) => {
    stopPreview()
    const saved = loadVoiceMappings()
    if (saved.some(row => row.id === rule.id)) {
      try {
        saveVoiceSettings(saved.map(row => row.id === rule.id ? { ...row, alertBeforeSpeech: checked } : row))
      } catch { message.error('警报设置保存失败，请重试。'); return }
    }
    update(rule.id, { alertBeforeSpeech: checked })
  }

  /** Preview exactly what this mapping's broadcast will sound like. */
  const previewRule = (rule: VoiceMapping) => {
    cancel.current?.()
    if (preview === rule.id) { setPreview(null); return }
    setPreview(rule.id)
    cancel.current = speakNaturalChinese(rule.text, {
      onEnd: () => setPreview(null),
      onError: () => { setPreview(null); message.error('语音播放失败，请重试。') },
    }, { ...resolveMappingVoice(rule), rate: speechRate })
  }

  const save = () => {
    const next = rules.map(row => ({ ...row, keyword: convertKeywordNumbers(row.keyword.trim()), text: row.text.trim() }))
    if (next.some(row => !normalizeKeyword(row.keyword) || !row.text)) { message.warning('请填写每条映射的有效关键词和播报文本。'); return }
    if (new Set(next.map(row => normalizeKeyword(row.keyword))).size !== next.length) { message.warning('关键词不能重复，请合并或修改重复映射。'); return }
    try {
      saveVoiceSettings(next, speechRate)
      stopPreview()
      setRules(loadVoiceMappings())
      message.success('播报语音设置已保存')
    } catch { message.error('保存失败，请检查浏览器存储空间。') }
  }


  return <main className="xiaoan-settings-shell"><div className="page page-enter voice-settings-page">
    <PageHeading title="小安设置" description="设置全局播报语速、声线和每条播报的警报提示" actions={<Link to={returnTo} className="voice-back-link"><ArrowLeft size={16} />{returnTo === '/ai-screen' ? '返回 AI 大屏' : '返回工作页面'}</Link>} />

    <div className="voice-settings-notice"><Info size={18} /><div><strong>说出关键词，小安自动回复</strong><p>开启语音唤醒后持续监听，播报结束后自动恢复；多个关键词同时命中时优先匹配最长的关键词。所有播报统一为<b>活力轻快</b>风格，并使用全局语速。勾选“播报前播放警报”后，先播放提示音，再朗读本条内容。</p></div></div>

    <SectionPanel title="全局语速" subtitle="适用于所有工作页面和 AI 大屏，保存后从下一次播报开始生效">
      <div className="voice-global-rate">
        <label className="voice-rule-voice-field" htmlFor="global-speech-rate"><span>播报速度</span><Select id="global-speech-rate" value={speechRate} onChange={value => { stopPreview(); setSpeechRate(value) }} options={Array.from({ length: Math.round((MAX_SPEECH_RATE - MIN_SPEECH_RATE) * 10) + 1 }, (_, index) => {
          const value = Number((MIN_SPEECH_RATE + index / 10).toFixed(1))
          return { value, label: `${value.toFixed(1)} 倍${value === DEFAULT_SPEECH_RATE ? '（默认）' : ''}` }
        })} /></label>
        <Button icon={preview === 'global-rate-preview' ? <Square size={14} /> : <Volume2 size={16} />} onClick={() => previewRule({ id: 'global-rate-preview', keyword: '', text: '您好，我是小安。当前检测数据已更新，请及时查看样本检测结果。', enabled: true, style: defaultVoiceStyle, voiceURI: '' })}>{preview === 'global-rate-preview' ? '停止试听' : '试听语速'}</Button>
        <Button onClick={() => { stopPreview(); setSpeechRate(DEFAULT_SPEECH_RATE) }}>恢复默认</Button>
        <p>数值越大，播报越快。试听使用当前选择，点击“保存全部设置”后全局生效。</p>
      </div>
    </SectionPanel>

    <SectionPanel className="voice-rules-panel" title="关键词播报" subtitle={`共 ${rules.length} 条 · ${rules.filter(r => r.enabled).length} 条启用`} extra={<Button icon={<Plus size={16} />} onClick={() => setRules(rows => [...rows, { id: crypto.randomUUID(), keyword: '', text: '', enabled: true, style: defaultVoiceStyle, voiceURI: '' }])}>添加播报</Button>}>
      {!rules.length && <div className="voice-empty"><Empty description="暂无播报映射，点击“添加播报”开始配置" /></div>}
      <div className="voice-mapping-list">{rules.map((rule, index) => <section className={`voice-mapping-card ${rule.enabled ? '' : 'is-disabled'}`} key={rule.id}>
        <header className="voice-rule-header">
          <div className="voice-rule-title"><span>{String(index + 1).padStart(2, '0')}</span><strong>{rule.keyword.trim() || '新建播报'}</strong>
          </div>
          <div className="voice-rule-controls"><span>{rule.enabled ? '已启用' : '已停用'}</span><Switch size="small" checked={rule.enabled} onChange={enabled => update(rule.id, { enabled })} aria-label={`启用播报 ${index + 1}`} /><Button type="text" danger icon={<Trash2 size={15} />} onClick={() => { stopPreview(); setRules(rows => rows.filter(row => row.id !== rule.id)) }} aria-label={`删除播报 ${index + 1}`}>删除</Button></div>
        </header>

        <div className="voice-rule-fields">
          <div className="voice-rule-field"><label htmlFor={`keyword-${rule.id}`}>触发关键词</label><Input id={`keyword-${rule.id}`} maxLength={40} placeholder="例如：异常预警" onBlur={() => update(rule.id, { keyword: convertKeywordNumbers(rule.keyword) })} value={rule.keyword} onChange={event => update(rule.id, { keyword: event.target.value })} /><small>包含关键词即可触发，阿拉伯数字会自动转为中文</small></div>
          <div className="voice-rule-field"><label htmlFor={`text-${rule.id}`}>播报内容</label><Input.TextArea id={`text-${rule.id}`} rows={3} maxLength={2000} showCount placeholder="输入小安需要朗读的完整内容" value={rule.text} onChange={event => update(rule.id, { text: event.target.value })} /></div>
        </div>

        <div className="voice-rule-voice">
          <Checkbox checked={rule.alertBeforeSpeech === true} onChange={event => setAlert(rule, event.target.checked)}>播报前播放警报</Checkbox>
          <div className="voice-rule-voice-grid">
            <label className="voice-rule-voice-field" htmlFor={`voice-${rule.id}`}><span>指定声线<small>（可选，默认按风格自动匹配）</small></span><Select id={`voice-${rule.id}`} value={rule.voiceURI} onChange={voiceURI => { stopPreview(); update(rule.id, { voiceURI }) }} options={voiceOptions} /></label>
            <div className="voice-rule-preview"><Button icon={preview === rule.id ? <Square size={14} /> : <Volume2 size={16} />} disabled={!rule.text.trim()} onClick={() => previewRule(rule)}>{preview === rule.id ? '停止试听' : '试听本条语音'}</Button></div>
          </div>
        </div>
      </section>)}</div>
    </SectionPanel>

    <footer className="voice-settings-actions xiaoan-save-bar"><span>全局语速和每条播报设置一起保存，仅保存在当前浏览器。</span><Button type="primary" icon={<Save size={16} />} onClick={save}>保存全部设置</Button></footer>
  </div></main>
}
