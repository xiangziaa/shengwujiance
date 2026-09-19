import { saveVoiceSettings } from '../utils/voiceStorage'
import { defaultVoiceStyle, DEFAULT_SPEECH_RATE, loadSpeechRate, loadGlobalVoice } from '../utils/voicePreferences'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Switch, Empty, Select, Checkbox, Modal, Progress, Spin, message } from 'antd'
import { ArrowLeft, Plus, Save, Volume2, Square, Trash2, Info } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeading } from '../components/common/PageHeading'
import { SectionPanel } from '../components/common/SectionPanel'
import { loadVoiceMappings, convertKeywordNumbers, normalizeKeyword, resolveMappingVoice, type VoiceMapping } from '../utils/voiceMappings'
import { speakNaturalChinese } from '../utils/naturalSpeech'
import { LocalTtsStatus } from '../components/common/LocalTtsStatus'
import { prepareLocalSpeech } from '../utils/localTts'

export function VoiceSettingsPage() {
  const location = useLocation()
  const source = location.state?.from
  const returnTo = typeof source === 'string' && /^\/(dashboard|samples|screening|elisa|qpcr|analysis|reports|knowledge|settings|ai-screen)(?:[/?]|$)/.test(source) ? source : '/ai-screen'
  const [rules, setRules] = useState<VoiceMapping[]>(loadVoiceMappings)
  const [speechRate, setSpeechRate] = useState(loadSpeechRate)
  const [globalVoice, setGlobalVoice] = useState(loadGlobalVoice)
  const [savedSettings, setSavedSettings] = useState(() => JSON.stringify({ rules, speechRate, globalVoice }))
  const hasUnsavedChanges = JSON.stringify({ rules, speechRate, globalVoice }) !== savedSettings
  const [preview, setPreview] = useState<string | null>(null)
  const cancel = useRef<(() => void) | null>(null)
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [generation, setGeneration] = useState({ completed: 0, total: 0, keyword: '' })

  useEffect(() => () => cancel.current?.(), [])
  useEffect(() => {
    if (!saving) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [saving])
  const voiceOptions = [
    { value: 'qwen:vivian', label: 'Vivian · 中文女声（默认）' },
    { value: 'qwen:serena', label: 'Serena · 中文女声' },
    { value: 'qwen:ono_anna', label: 'Ono_Anna · 日语原生女声' },
    { value: 'qwen:sohee', label: 'Sohee · 韩语原生女声' },
  ]

  const update = (id: string, change: Partial<VoiceMapping>) => setRules(rows => rows.map(row => row.id === id ? { ...row, ...change } : row))

  const stopPreview = () => { cancel.current?.(); cancel.current = null; setPreview(null) }

  const setAlert = (rule: VoiceMapping, checked: boolean) => {
    stopPreview()
    update(rule.id, { alertBeforeSpeech: checked })
  }

  /** Preview exactly what this mapping's broadcast will sound like. */
  const previewRule = (rule: VoiceMapping) => {
    cancel.current?.()
    if (preview === rule.id) { setPreview(null); return }
    setPreview(rule.id)
    cancel.current = speakNaturalChinese(rule.text, {
      onEnd: () => setPreview(null),
      onError: error => { setPreview(null); message.error(error) },
    }, { ...resolveMappingVoice(rule), previewVoiceURI: globalVoice, rate: speechRate })
  }

  const save = async () => {
    if (savingRef.current) return
    const next = rules.map(row => ({ ...row, keyword: convertKeywordNumbers(row.keyword.trim()), text: row.text.trim() }))
    if (next.some(row => !normalizeKeyword(row.keyword) || !row.text)) { message.warning('请填写每条映射的有效关键词和播报文本。'); return }
    if (new Set(next.map(row => normalizeKeyword(row.keyword))).size !== next.length) { message.warning('关键词不能重复，请合并或修改重复映射。'); return }
    savingRef.current = true
    setSaving(true)
    stopPreview()
    setGeneration({ completed: 0, total: next.length, keyword: '' })
    let currentKeyword = ''
    try {
      for (const [index, rule] of next.entries()) {
        currentKeyword = rule.keyword
        setGeneration({ completed: index, total: next.length, keyword: rule.keyword })
        await prepareLocalSpeech(rule.text, globalVoice, speechRate)
        setGeneration({ completed: index + 1, total: next.length, keyword: rule.keyword })
      }
      currentKeyword = ''
      saveVoiceSettings(next, speechRate, globalVoice)
      stopPreview()
      const savedRules = loadVoiceMappings()
      setRules(savedRules)
      setSavedSettings(JSON.stringify({ rules: savedRules, speechRate, globalVoice }))
      message.success('全部设置已保存，语音文件已准备好，可直接本地播报')
    } catch (error) {
      message.error(currentKeyword ? `“${currentKeyword}”未完成：${error instanceof Error && error.name !== 'TypeError' && error.name !== 'AbortError' ? error.message : '服务连接失败或生成超时。'}设置尚未更新，已生成文件保留，重试会继续复用。` : '设置保存失败，请检查浏览器存储空间；已生成的语音文件仍保留。')
    } finally { savingRef.current = false; setSaving(false) }
  }

  return <main className="xiaoan-settings-shell"><div className="page page-enter voice-settings-page">
    <PageHeading title="小安设置" description="统一设置全局声线和播报节奏，单独配置每条播报的警报提示" actions={<Link to={returnTo} className="voice-back-link"><ArrowLeft size={16} />{returnTo === '/ai-screen' ? '返回 AI 大屏' : '返回工作页面'}</Link>} />

    <div className="voice-settings-notice"><Info size={18} /><div><strong>说出关键词，小安自动回复</strong><p>开启语音唤醒后持续监听，播报结束后自动恢复；多个关键词同时命中时优先匹配最长的关键词。默认使用 Vivian 系统播报。点击“保存全部设置”会提前生成所有映射的语音并保存到项目本地，播报时优先读取文件；修改文本、声线或语速后需重新保存。新内容首次生成需要等待。语音识别仍取决于浏览器，离线时可手动播报。勾选“播报前播放警报”后，先播放提示音，再朗读本条内容。</p></div></div>

    <LocalTtsStatus details />

    {hasUnsavedChanges && <Alert type="warning" showIcon title="有未保存的修改，保存后生效" description="请点击“保存全部设置”。试听使用当前修改，正式播报仍使用已保存的设置。" />}

    <SectionPanel title="全局播报设置" subtitle="适用于所有工作页面和 AI 大屏，保存后从下一次播报开始生效">
      <div className="voice-global-rate">
        <label className="voice-rule-voice-field" htmlFor="global-voice"><span>本地声线</span><Select id="global-voice" value={globalVoice} onChange={value => { stopPreview(); setGlobalVoice(value) }} options={voiceOptions} /></label>
        <label className="voice-rule-voice-field" htmlFor="global-speech-rate"><span>播报节奏</span><Select id="global-speech-rate" value={speechRate < 1 ? 0.85 : speechRate > 1 ? 1.15 : 1} onChange={value => { stopPreview(); setSpeechRate(value) }} options={[{ value: 0.85, label: '稍慢' }, { value: 1, label: '标准（默认）' }, { value: 1.15, label: '稍快' }]} /></label>
        <Button icon={preview === 'global-rate-preview' ? <Square size={14} /> : <Volume2 size={16} />} onClick={() => previewRule({ id: 'global-rate-preview', keyword: '', text: '您好，我是小安。当前检测数据已更新，请及时查看样本检测结果。', enabled: true, style: defaultVoiceStyle, voiceURI: '' })}>{preview === 'global-rate-preview' ? '停止试听' : '试听全局语音'}</Button>
        <Button onClick={() => { stopPreview(); setSpeechRate(DEFAULT_SPEECH_RATE) }}>恢复默认</Button>
        <p>Qwen 按所选节奏直接生成语音，不对音频做倍速拉伸；实际节奏随文本变化。试听使用当前选择，点击“保存全部设置”后全局生效。</p>
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
            <div className="voice-rule-preview"><Button icon={preview === rule.id ? <Square size={14} /> : <Volume2 size={16} />} disabled={!rule.text.trim()} onClick={() => previewRule(rule)}>{preview === rule.id ? '停止试听' : '试听本条语音'}</Button></div>
          </div>
        </div>
      </section>)}</div>
    </SectionPanel>

    <footer className="voice-settings-actions xiaoan-save-bar"><span role="status" aria-live="polite">{hasUnsavedChanges ? '有未保存的修改，点击“保存全部设置”后生效。' : '保存时预生成全部语音，完成后设置生效。'}</span><div><Button type="primary" loading={saving} icon={<Save size={16} />} onClick={() => void save()}>保存全部设置</Button></div></footer>
    <Modal open={saving} title="正在准备本地播报语音" closable={false} maskClosable={false} keyboard={false} footer={null}>
      <div role="status" aria-live="polite" aria-busy={saving}><Spin size="small" /> 已完成 {generation.completed} / {generation.total} 条
        <Progress percent={generation.total ? Math.round(generation.completed / generation.total * 100) : 100} status="active" />
        <p>{generation.keyword ? `正在处理：${generation.keyword}` : '正在保存设置…'}</p>
        <p>首次生成需要一些时间，请保持页面打开。已有文件直接复用，全部完成后保存设置。此后的预设播报直接读取本地文件。</p>
      </div>
    </Modal>
  </div></main>
}
