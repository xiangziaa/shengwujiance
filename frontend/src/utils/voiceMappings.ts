import { readVoiceSetting, writeVoiceSetting } from './voiceStorage'
import { defaultVoicePreferences, defaultVoiceStyle, isVoiceStyleId, type VoicePreferences, type VoiceStyleId } from './voicePreferences'

export interface VoiceMapping {
  id: string
  keyword: string
  text: string
  enabled: boolean
  /** Broadcast style for this field; defaults to 活力轻快. */
  style: VoiceStyleId
  /** Broadcast voice for this field; '' uses the device's default Chinese voice. */
  voiceURI: string
  alertBeforeSpeech?: boolean
}

export const VOICE_KEY = 'bio-voice-mappings'
const DEFAULTS_VERSION_KEY = 'bio-voice-mappings-defaults-v4'

export const defaultTaskMappings: VoiceMapping[] = [
  { id: 'default-toxin-review', keyword: '毒素检测与智能平台数据复核', text: '粮安智检团队您好，AI质检平台检测到某粮站某批次玉米送检样品数据存在异常，已自动标记4份玉米样品进入复检队列。请前往现场完成霉菌与黄曲霉毒素B1双指标检测、结果复核，并出具检测报告。', enabled: true, style: 'bright', voiceURI: '' },
  { id: 'default-sample-four', keyword: '样品四的浓度', text: '异常预警：当前ELISA检测4号样品吸光度超出标准曲线最大范围，建议复核。', enabled: true, style: 'bright', voiceURI: '' },
  { id: 'default-alert-serious', keyword: '异常预警', text: '请注意，当前存在超标风险样品，请立即复核检测数据并跟进处置流程。', enabled: true, style: 'bright', voiceURI: '', alertBeforeSpeech: true },
  { id: 'default-quality-result', keyword: '质量控制和判定结果一致', text: '报告已生成，检测结果和处置建议已经反馈至粮站，2号超标批次已启动UDI追溯隔离流程。', enabled: true, style: 'bright', voiceURI: '' },
]

function normalizeMapping(row: Partial<VoiceMapping> & { id: string; keyword: string; text: string; enabled: boolean }): VoiceMapping {
  return {
    ...row,
    style: defaultVoiceStyle,
    voiceURI: typeof row.voiceURI === 'string' ? row.voiceURI : '',
    alertBeforeSpeech: typeof row.alertBeforeSpeech === 'boolean' ? row.alertBeforeSpeech : row.id === 'default-alert-serious' || row.keyword === '异常预警',
  }
}

export function loadVoiceMappings(): VoiceMapping[] {
  let rows: VoiceMapping[]
  try {
    const saved = JSON.parse(readVoiceSetting(VOICE_KEY) ?? 'null')
    if (Array.isArray(saved)) {
      rows = saved
        .filter((r): r is VoiceMapping => typeof r?.id === 'string' && typeof r?.keyword === 'string' && typeof r?.text === 'string' && typeof r?.enabled === 'boolean')
        .map((r) => normalizeMapping(r))
    } else {
      const old = JSON.parse(localStorage.getItem('bio-digital-human-wake-settings') ?? '{}')
      rows = [normalizeMapping({ id: 'welcome', keyword: typeof old?.wakeWord === 'string' ? old.wakeWord : '小安', text: typeof old?.wakeReply === 'string' ? old.wakeReply : '我在，请问有什么可以帮您？', enabled: true })]
    }
  } catch { rows = [normalizeMapping({ id: 'welcome', keyword: '小安', text: '我在，请问有什么可以帮您？', enabled: true })] }
  // Upgrade numeric keywords without replacing custom replies or enabled switches.
  rows = rows.map(savedRow => {
    const row = { ...savedRow, keyword: convertKeywordNumbers(savedRow.keyword) }
    const preset = defaultTaskMappings.find(p => normalizeKeyword(p.keyword) === normalizeKeyword(row.keyword))
    return preset ? { ...row, keyword: preset.keyword } : row
  })
  // Add the new presets once, preserving existing text, switches and later deletions.
  try {
    if (localStorage.getItem(DEFAULTS_VERSION_KEY) === '1') return rows
  } catch { /* Defaults also work when storage is unavailable. */ }
  const merged = [...rows, ...defaultTaskMappings.filter(preset => !rows.some(row => row.id === preset.id || normalizeKeyword(row.keyword) === normalizeKeyword(preset.keyword))).map(row => ({ ...row }))]
  try {
    writeVoiceSetting(VOICE_KEY, merged)
    localStorage.setItem(DEFAULTS_VERSION_KEY, '1')
  } catch { /* Return usable presets even if they cannot be persisted. */ }
  return merged
}

function chineseInteger(raw: string): string {
  const digits = '零一二三四五六七八九'
  if (raw.length > 8 || (raw.length > 1 && raw[0] === '0')) return [...raw].map(n => digits[Number(n)]).join('')
  const convert = (n: number, leading = true): string => {
    if (n < 10) return digits[n]
    if (n >= 10000) return convert(Math.floor(n / 10000)) + '万' + (n % 10000 ? (n % 10000 < 1000 ? '零' : '') + convert(n % 10000, false) : '')
    const units = [[1000, '千'], [100, '百'], [10, '十']] as const
    for (const [unit, label] of units) {
      if (n >= unit) return (leading && unit === 10 && n < 20 ? '' : digits[Math.floor(n / unit)]) + label + (n % unit ? (n % unit < unit / 10 ? '零' : '') + convert(n % unit, false) : '')
    }
    return ''
  }
  return convert(Number(raw))
}

export const convertKeywordNumbers = (text: string) => text.replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xff10)).replace(/\d+(?:\.\d+)?/g, raw => {
  const [integer, decimal] = raw.split('.')
  return chineseInteger(integer) + (decimal ? '点' + [...decimal].map(digit => '零一二三四五六七八九'[Number(digit)]).join('') : '')
})

export const normalizeKeyword = (text: string) => convertKeywordNumbers(text).replace(/[\s，。！？、,.!?；;：:]/g, '').toLowerCase()

export function matchVoiceMapping(text: string, rules = loadVoiceMappings()): VoiceMapping | undefined {
  const normalized = normalizeKeyword(text)
  return rules.filter(r => r.enabled && normalizeKeyword(r.keyword) && normalized.includes(normalizeKeyword(r.keyword))).sort((a, b) => normalizeKeyword(b.keyword).length - normalizeKeyword(a.keyword).length)[0]
}

/**
 * Speech settings for one broadcast. Each mapping owns its voice; the built-in
 * default (活力轻快 + device Chinese voice) applies when a field is unset.
 */
export function resolveMappingVoice(rule?: Pick<VoiceMapping, 'style' | 'voiceURI' | 'alertBeforeSpeech'> | null): VoicePreferences {
  if (!rule) return defaultVoicePreferences
  return {
    style: isVoiceStyleId(rule.style) ? rule.style : defaultVoiceStyle,
    voiceURI: typeof rule.voiceURI === 'string' ? rule.voiceURI : '',
    alertBeforeSpeech: rule.alertBeforeSpeech === true,
  }
}
