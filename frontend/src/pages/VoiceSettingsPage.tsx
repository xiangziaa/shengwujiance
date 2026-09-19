import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Switch, Checkbox, Empty, message } from 'antd'
import { ArrowLeft, Plus, Save, Volume2, Square, Trash2, Upload, FileAudio, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeading } from '../components/common/PageHeading'
import { SectionPanel } from '../components/common/SectionPanel'
import { LocalAsrStatus } from '../components/common/LocalAsrStatus'
import { loadVoiceMappings, convertKeywordNumbers, normalizeKeyword, resolveMappingVoice, type VoiceMapping } from '../utils/voiceMappings'
import { saveVoiceSettings } from '../utils/voiceStorage'
import { speakNaturalChinese } from '../utils/naturalSpeech'
import { saveAudioFile } from '../utils/audioFiles'

export function VoiceSettingsPage() {
  const location = useLocation()
  const source = location.state?.from
  const returnTo = typeof source === 'string' && /^\/(dashboard|samples|screening|elisa|qpcr|analysis|reports|knowledge|settings|ai-screen)(?:[/?]|$)/.test(source) ? source : '/ai-screen'
  const [rules, setRules] = useState<VoiceMapping[]>(loadVoiceMappings)
  const [saved, setSaved] = useState(() => JSON.stringify(rules))
  const [preview, setPreview] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const cancel = useRef<(() => void) | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancel.current?.() } }, [])
  const dirty = JSON.stringify(rules) !== saved
  const stop = () => { cancel.current?.(); cancel.current = null; setPreview(null) }
  const update = (id: string, change: Partial<VoiceMapping>) => setRules(rows => rows.map(row => row.id === id ? { ...row, ...change } : row))
  const chooseFile = async (id: string, file: File) => {
    stop(); setImporting(true)
    try {
      const audioId = await saveAudioFile(file)
      if (mounted.current) { update(id, { audioId, audioName: file.name }); message.success('音频已选择，保存全部设置后生效') }
    } catch (error) { message.error(error instanceof Error ? error.message : '选择音频失败') }
    finally { if (mounted.current) setImporting(false) }
  }
  const play = (rule: VoiceMapping) => {
    stop()
    if (preview === rule.id) return
    if (!rule.audioId) { message.warning('请先选择这条关键词对应的音频'); return }
    setPreview(rule.id)
    cancel.current = speakNaturalChinese(rule.text, {
      onEnd: () => setPreview(null),
      onError: error => { setPreview(null); message.error(error) },
    }, resolveMappingVoice(rule))
  }
  const save = () => {
    const next = rules.map(row => ({ ...row, keyword: convertKeywordNumbers(row.keyword.trim()), text: row.text.trim() }))
    if (next.some(row => !normalizeKeyword(row.keyword))) { message.warning('请填写有效关键词'); return }
    if (new Set(next.map(row => normalizeKeyword(row.keyword))).size !== next.length) { message.warning('关键词不能重复'); return }
    try {
      saveVoiceSettings(next)
      const savedRules = loadVoiceMappings()
      setRules(savedRules); setSaved(JSON.stringify(savedRules)); stop()
      message.success('设置已保存，关键词命中后直接播放所选音频')
    } catch { message.error('保存失败，请检查浏览器本地存储空间') }
  }
  return <main className="xiaoan-settings-shell"><div className="page page-enter voice-settings-page audio-settings-page">
    <PageHeading title="小安设置" description="为关键词选择音频，直接播放文件，不再生成语音" actions={<Link to={returnTo} className="voice-back-link"><ArrowLeft size={16} />返回工作页面</Link>} />
    <Alert type="info" showIcon title="直接播放你选择的音频" description="支持 MP3、WAV 等浏览器可播放的音频，单个文件不超过 50 MB。音频副本保存在当前浏览器本地，刷新后可用，无需 TTS 服务或联网。换浏览器、清除站点数据或换电脑后需要重新选择。每个关键词对应一个音频文件，选择后保存即可生效。" />
    <LocalAsrStatus />
    {dirty && <Alert type="warning" showIcon title="有未保存的修改，保存后生效" description="试听使用当前选择，正式播报使用已保存的音频。" />}
    <SectionPanel className="voice-rules-panel" title="关键词音频" subtitle={`共 ${rules.length} 条 · ${rules.filter(row => row.audioId).length} 条已选择音频`} extra={<Button disabled={importing} icon={<Plus size={16} />} onClick={() => setRules(rows => [...rows, { id: crypto.randomUUID(), keyword: '', text: '', enabled: true, style: 'bright', voiceURI: '' }])}>添加播报</Button>}>
      {!rules.length && <Empty description="添加关键词并选择音频" />}
      <div className="voice-mapping-list">{rules.map((rule, index) => <section key={rule.id} className={`voice-mapping-card ${rule.enabled ? '' : 'is-disabled'}`}>
        <header className="voice-rule-header"><div className="voice-rule-title"><span>{String(index + 1).padStart(2, '0')}</span><strong>{rule.keyword || '新建播报'}</strong></div>
          <div className="voice-rule-controls"><span>{rule.enabled ? '已启用' : '已停用'}</span><Switch checked={rule.enabled} onChange={enabled => update(rule.id, { enabled })} aria-label={`启用播报 ${index + 1}`} /><Button danger type="text" disabled={importing} icon={<Trash2 size={15} />} onClick={() => { stop(); setRules(rows => rows.filter(row => row.id !== rule.id)) }}>删除</Button></div>
        </header>
        <div className="audio-rule-body">
          <div className="audio-keyword-field">
            <label htmlFor={`keyword-${rule.id}`}>触发关键词</label>
            <Input id={`keyword-${rule.id}`} value={rule.keyword} maxLength={40} placeholder="例如：异常预警" onChange={event => update(rule.id, { keyword: event.target.value })} onBlur={() => update(rule.id, { keyword: convertKeywordNumbers(rule.keyword) })} />
            <small>说出关键词即可播放，多个命中时优先匹配较长的关键词。</small>
          </div>
          <div className="audio-file-field">
            <span className="audio-field-label">播放音频</span>
            <div className={`audio-file-box ${rule.audioId ? 'has-file' : ''}`}>
              <FileAudio size={24} aria-hidden="true" />
              <div className="audio-file-summary"><strong title={rule.audioName}>{rule.audioName || '尚未选择音频'}</strong><small>{rule.audioId ? '已存于本机，可直接试听' : '支持 MP3、WAV 等格式，最大 50 MB'}</small></div>
              <input id={`audio-${rule.id}`} className="audio-file-input" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm" disabled={importing} aria-label={`选择 ${rule.keyword || index + 1} 的音频`} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void chooseFile(rule.id, file) }} />
              <Button disabled={importing} icon={<Upload size={16} />} onClick={() => document.getElementById(`audio-${rule.id}`)?.click()}>{rule.audioId ? '更换音频' : '选择音频'}</Button>
            </div>
          </div>
        </div>
        <div className="audio-rule-footer">
          <Checkbox checked={rule.alertBeforeSpeech === true} onChange={event => { stop(); update(rule.id, { alertBeforeSpeech: event.target.checked }) }}>播放前先响警报</Checkbox>
          <div className="audio-rule-actions">
            <Button disabled={!rule.audioId || importing} icon={preview === rule.id ? <Square size={16} /> : <Volume2 size={16} />} onClick={() => play(rule)}>{preview === rule.id ? '停止试听' : '试听音频'}</Button>
            <Button disabled={!rule.audioId || importing} icon={<X size={16} />} onClick={() => { stop(); update(rule.id, { audioId: undefined, audioName: undefined }) }}>取消音频选择</Button>
          </div>
        </div>
      </section>)}</div>
    </SectionPanel>
    <footer className="voice-settings-actions xiaoan-save-bar"><span role="status" aria-live="polite">{importing ? '正在保存音频文件…' : dirty ? '有未保存的修改，保存后生效。' : '直接播放所选音频，无需语音生成服务。'}</span><Button type="primary" disabled={importing} icon={<Save size={16} />} onClick={save}>保存全部设置</Button></footer>
  </div></main>
}
