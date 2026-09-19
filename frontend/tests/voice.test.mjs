import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
const storage = new Map()
const localStorage = {getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v)}
function load(file, globals = {}, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{ exports, require: k => imports[k] ?? (k === './localAsr' ? { LocalRecognition: globals.window.SpeechRecognition, localAsrSupported: () => true } : k === './voiceStorage' ? voiceStorage : undefined), localStorage, ...globals })
  return exports
}
const dispatched = []
const voiceStorage = load('utils/voiceStorage.ts', {window: {dispatchEvent: event => dispatched.push(event.type)}, Event: class {constructor(type) {this.type = type}}})
const preferences=load('utils/voicePreferences.ts')
const mappings = load('utils/voiceMappings.ts', {}, {'./voicePreferences':preferences})
const rules = [{id:'1',keyword:'检测',text:'short',enabled:true},{id:'2',keyword:'检测流程',text:'long',enabled:true},{id:'3',keyword:'停用',text:'off',enabled:false}]
assert.equal(mappings.matchVoiceMapping('请介绍检测，流程。',rules).text,'long')
assert.equal(mappings.matchVoiceMapping('停用',rules),undefined)
assert.equal(mappings.matchVoiceMapping('没有匹配',rules),undefined)
storage.set('bio-digital-human-wake-settings',JSON.stringify({wakeWord:'你好小安',wakeReply:'欢迎'}))
assert.equal(mappings.loadVoiceMappings()[0].text,'欢迎')
storage.set('bio-voice-mappings','[]')
assert.equal(mappings.loadVoiceMappings().length,0)
storage.set('bio-voice-mappings',JSON.stringify(rules))
let cleanup, timers = [], received = [], disabled = 0
const instances = []
class Recognition {
  constructor(){ instances.push(this) }
  start(){this.started=true}
  abort(){this.onend?.()}
}
const win = { addEventListener:()=>{}, removeEventListener:()=>{}, SpeechRecognition: Recognition, setTimeout: f => (timers.push(f),timers.length), clearTimeout:()=>{} }
const hook = load('utils/useWakeListener.ts',{window:win,navigator:{userActivation:{hasBeenActive:true}}},{react:{useState:value=>[typeof value === 'function' ? value() : value,()=>{}],useRef:value=>({current:value}),useEffect:f=>{cleanup=f()}},antd:{message:{error:()=>{}}},'./voiceMappings':mappings})
hook.useWakeListener(true,false,rule=>received.push(rule.text),()=>disabled++)
assert.equal(instances[0].continuous,true)
instances[0].onresult({resultIndex:0,results:[{0:{transcript:'未匹配'},isFinal:true}]})
assert.equal(received.length,0)
instances[0].onresult({resultIndex:1,results:[{0:{transcript:'旧结果'},isFinal:true},{0:{transcript:'检测流程'},isFinal:true}]})
assert.deepEqual(received,['long'])
instances[0].onresult({resultIndex:0,results:[{0:{transcript:'检测'},isFinal:true}]})
assert.equal(received.length,1)
timers.shift()()
assert.equal(instances.length,2)
instances[1].onerror({error:'not-allowed'})
assert.equal(disabled,1)
cleanup()
const count=instances.length
hook.useWakeListener(true,true,()=>{},()=>{})
assert.equal(instances.length,count)
storage.clear()
assert.equal(mappings.loadVoiceMappings().length,5)
assert.equal(mappings.loadVoiceMappings().length,5)
assert.ok(mappings.loadVoiceMappings().every(r=>r.enabled))
storage.clear()
const custom={id:'custom',keyword:'样品四的浓度',text:'用户自定义回复',enabled:false}
storage.set('bio-voice-mappings',JSON.stringify([custom]))
const migrated=mappings.loadVoiceMappings()
assert.equal(migrated.length,4)
assert.equal(migrated.find(r=>r.keyword===custom.keyword).text,custom.text)
assert.equal(migrated.find(r=>r.keyword===custom.keyword).enabled,false)
storage.set('bio-voice-mappings','[]')
assert.equal(mappings.loadVoiceMappings().length,0)
console.log('PASS: built-in mappings, one-time upgrade, deduplication, custom text/switch preservation, deletion persistence')

// Fresh HTTPS navigation: no settings visit or save is needed to initialize.
storage.clear()
const stateSlots = [], refSlots = [], effectSlots = [], listeners = new Map(), sessions = []
let stateIndex, refIndex, effectIndex, effects, disabledFresh = 0, enabledFresh = true, busyFresh = false
const firstVisitWindow = {
  SpeechRecognition: class extends Recognition {
    constructor() { super(); sessions.push(this) }
  },
  setTimeout: f => (timers.push(f), timers.length), clearTimeout: () => {},
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name) },
}
const firstVisit = load('utils/useWakeListener.ts', {
  window: firstVisitWindow, navigator: {userActivation: {hasBeenActive: false}},
}, {react: {
  useState(initial) {
    const index = stateIndex++
    if (!(index in stateSlots)) stateSlots[index] = typeof initial === 'function' ? initial() : initial
    return [stateSlots[index], value => { stateSlots[index] = typeof value === 'function' ? value(stateSlots[index]) : value }]
  },
  useRef(initial) { const index = refIndex++; return refSlots[index] ??= {current: initial} },
  useEffect(fn, deps) {
    const index = effectIndex++, previous = effectSlots[index]
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
      effects.push(() => { previous?.cleanup?.(); effectSlots[index] = {deps, cleanup: fn()} })
    }
  },
}, antd: {message: {error: () => {}}}, './voiceMappings': mappings})
const freshReplies = []
function renderWake() {
  stateIndex = refIndex = effectIndex = 0; effects = []
  const result = firstVisit.useWakeListener(enabledFresh, busyFresh, rule => freshReplies.push(rule.text), () => disabledFresh++)
  effects.forEach(fn => fn())
  return result
}
let wake = renderWake()
assert.equal(wake.needsActivation, true)
assert.equal(wake.label, '点击启用语音')
assert.equal(sessions.length, 0)
assert.equal(JSON.parse(storage.get(mappings.VOICE_KEY)).length, 5)
listeners.get('click')({isTrusted: false})
renderWake()
assert.equal(sessions.length, 0, 'synthetic events must not activate speech')
listeners.get('click')({isTrusted: true})
wake = renderWake()
assert.equal(wake.needsActivation, false)
assert.equal(wake.listening, false, 'do not claim listening before recognition starts')
assert.equal(sessions.length, 1)
sessions[0].onstart()
assert.equal(renderWake().listening, true)
sessions[0].onresult({resultIndex: 0, results: [{0: {transcript: '小安'}, isFinal: true}]})
assert.deepEqual(freshReplies, ['我在，请问有什么可以帮您？'])
busyFresh = true
assert.equal(renderWake().listening, false)
busyFresh = false
renderWake()
assert.equal(sessions.length, 2, 'resume after playback without visiting settings')
sessions[0].onerror({error: 'not-allowed'})
assert.equal(disabledFresh, 0, 'ignore errors from a disposed session')
sessions[1].onerror({error: 'network'})
assert.equal(renderWake().label, '语音连接重试中')
sessions[1].onstart()
assert.equal(renderWake().listening, true)
enabledFresh = false
assert.equal(renderWake().listening, false)
effectSlots.forEach(effect => effect.cleanup?.())
console.log('PASS: first visit presets, real interaction activation, accurate listening status, default wake reply without save, playback resume, stale session isolation and network status')

storage.clear()
for (const [raw, converted] of [['样品4的浓度','样品四的浓度'],['第12批','第十二批'],['110号','一百一十号'],['101号','一百零一号'],['10001号','一万零一号'],['编号007','编号零零七'],['样品４','样品四'],['浓度1.25','浓度一点二五']]) {
  assert.equal(mappings.convertKeywordNumbers(raw), converted)
}
assert.equal(mappings.matchVoiceMapping('请查样品4的浓度').id, 'default-sample-four')
assert.equal(mappings.matchVoiceMapping('样品四的浓度',[{id:'n',keyword:'样品4的浓度',text:'数字',enabled:true}]).text, '数字')
const newRules = [{id:'saved',keyword:'样品12',text:'新回复',enabled:true,style:'serious',voiceURI:'serious'}]
voiceStorage.saveVoiceSettings(newRules)
assert.equal(mappings.matchVoiceMapping('样品十二').text, '新回复')
assert.equal(mappings.loadVoiceMappings()[0].keyword, '样品十二')
assert.equal(mappings.loadVoiceMappings()[0].style, 'bright')
assert.equal(dispatched.at(-1), voiceStorage.VOICE_SETTINGS_EVENT)
const beforeFailure = storage.get(voiceStorage.VOICE_SETTINGS_KEY)
const write = localStorage.setItem
localStorage.setItem = () => { throw new Error('QuotaExceededError') }
assert.throws(() => voiceStorage.saveVoiceSettings([], 1.2), /QuotaExceededError/)
localStorage.setItem = write
assert.equal(storage.get(voiceStorage.VOICE_SETTINGS_KEY), beforeFailure)
assert.equal(mappings.matchVoiceMapping('样品12').text, '新回复')
assert.equal(mappings.loadVoiceMappings()[0].style, 'bright')
console.log('PASS: Arabic/full-width number conversion, recognition equivalence, immediate atomic settings save, storage-failure rollback')

storage.clear()
const presetRules = mappings.loadVoiceMappings()
assert.equal(presetRules.find(r=>r.id==='welcome').style,'bright')
assert.equal(presetRules.find(r=>r.id==='default-sample-four').style,'bright')
storage.clear()
storage.set('bio-voice-mappings',JSON.stringify([{id:'old',keyword:'警告',text:'样品异常',enabled:false},{id:'custom',keyword:'预警测试',text:'预警',enabled:true,style:'bright',voiceURI:'bright'}]))
const upgraded=mappings.loadVoiceMappings()
assert.equal(upgraded.find(r=>r.id==='old').style,'bright')
assert.equal(upgraded.find(r=>r.id==='old').enabled,false)
assert.equal(upgraded.find(r=>r.id==='custom').style,'bright')
console.log('PASS: warning preset defaults, legacy warning migration, explicit choice preservation')

storage.clear()
storage.set('bio-voice-mappings',JSON.stringify([{id:'legacy',keyword:'旧设置',text:'原文',enabled:true,style:'serious',alertBeforeSpeech:true}]))
const legacy=mappings.loadVoiceMappings().find(row=>row.id==='legacy')
assert.equal(legacy.style,'bright')
assert.equal(legacy.text,'原文')
assert.equal(mappings.resolveMappingVoice(legacy).alertBeforeSpeech,true)
voiceStorage.saveVoiceSettings([legacy])
assert.equal(mappings.loadVoiceMappings()[0].alertBeforeSpeech,true)
console.log('PASS: old style migration and alert persistence')

// Global speech rate: persistence, preview isolation, validation, and atomic saves.
storage.clear()
assert.equal(preferences.loadSpeechRate(), 1)
voiceStorage.saveVoiceSettings(newRules, 1.2)
assert.equal(preferences.loadSpeechRate(), 1.2)
voiceStorage.saveVoiceSettings(newRules)
assert.equal(preferences.loadSpeechRate(), 1.2)
const savedRateSnapshot = storage.get(voiceStorage.VOICE_SETTINGS_KEY)
localStorage.setItem = () => { throw new Error('QuotaExceededError') }
assert.throws(() => voiceStorage.saveVoiceSettings([], 0.7), /QuotaExceededError/)
localStorage.setItem = write
assert.equal(storage.get(voiceStorage.VOICE_SETTINGS_KEY), savedRateSnapshot)
voiceStorage.saveVoiceSettings(newRules, 0.8)
assert.equal(preferences.normalizeSpeechRate(20), 1.5)
assert.equal(preferences.normalizeSpeechRate(-1), 0.7)
assert.equal(preferences.normalizeSpeechRate(NaN), 1)
assert.equal(preferences.normalizeSpeechRate('fast'), 1)
storage.set(voiceStorage.VOICE_SETTINGS_KEY, '{broken')
assert.equal(preferences.loadSpeechRate(), 1)
storage.clear()
console.log('PASS: global speech rate, draft preview isolation, saved rate preservation, atomic save failure, next broadcast update, invalid storage fallback')

storage.clear()
const initialAlerts = mappings.loadVoiceMappings()
assert.equal(initialAlerts.length, 5)
assert.equal(initialAlerts[3].keyword, '异常预警')
assert.equal(initialAlerts[3].alertBeforeSpeech, true)
voiceStorage.saveVoiceSettings(initialAlerts.map(row => ({...row, alertBeforeSpeech: false})), 1.2)
assert.equal(mappings.loadVoiceMappings().find(row=>row.keyword==='异常预警').alertBeforeSpeech, false)
voiceStorage.saveVoiceSettings(mappings.loadVoiceMappings().map(row => row.keyword==='异常预警' ? {...row, alertBeforeSpeech:true} : row))
assert.equal(mappings.loadVoiceMappings().find(row=>row.keyword==='异常预警').alertBeforeSpeech, true)
assert.equal(preferences.loadSpeechRate(), 1.2)
storage.clear()
storage.set('bio-voice-mappings', JSON.stringify([{id:'default-alert-serious',keyword:'异常预警',text:'预警',enabled:true}]))
assert.equal(mappings.loadVoiceMappings()[0].alertBeforeSpeech, true)
console.log('PASS: fourth default warning enabled, both checkbox states persist across reload, legacy missing default and global rate preservation')

// File-only playback: no synthesis, full audio, alarm order, cancellation and errors.
const audios = [], revoked = []
let read = async id => new Blob(['audio'])
class LocalAudio {
  constructor(url) { this.url=url; audios.push(this) }
  play() { return Promise.resolve() }
  pause() { this.paused=true }
}
const speech=load('utils/naturalSpeech.ts', {
  AbortController, Audio:LocalAudio,
  URL:{createObjectURL:()=> 'blob:test', revokeObjectURL:url=>revoked.push(url)},
  fetch:()=>{throw new Error('File playback must not use network')},
}, {'./voicePreferences':preferences,'./audioFiles':{readAudioFile:id=>read(id)},'../assets/xiaoan-alert.wav':'alert.wav'})
const tick=()=>new Promise(resolve=>setImmediate(resolve))
let starts=0, ends=0, errors=[]
const handlers={onStart:()=>starts++,onEnd:()=>ends++,onError:error=>errors.push(error)}
speech.speakNaturalChinese('',handlers,{style:'bright',voiceURI:'',audioId:'file-1',alertBeforeSpeech:true})
await tick()
assert.equal(audios.at(-1).url,'alert.wav')
audios.at(-1).onended(); await tick()
assert.equal(audios.at(-1).url,'blob:test')
audios.at(-1).onended(); await tick()
assert.equal(starts,1);assert.equal(ends,1);assert.equal(revoked.length,1)
const audioCount=audios.length
speech.speakNaturalChinese('No audio selected',handlers)
await tick();assert.equal(audios.length,audioCount);assert.equal(ends,2)
let release
read=()=>new Promise(resolve=>{release=resolve})
const cancel=speech.speakNaturalChinese('取消',handlers,{style:'bright',voiceURI:'',audioId:'file-1'})
cancel();release(new Blob(['audio']));await tick()
assert.equal(audios.length,audioCount);assert.equal(ends,2)
read=async()=>{throw new Error('音频不存在')}
speech.speakNaturalChinese('missing',handlers,{style:'bright',voiceURI:'',audioId:'missing'})
await tick();assert.equal(errors.length,1)
voiceStorage.saveVoiceSettings([{id:'audio-only',keyword:'播放',text:'',enabled:true,style:'bright',voiceURI:'',audioId:'saved-file',audioName:'通知.mp3'}])
const audioRule=mappings.loadVoiceMappings().find(row=>row.id==='audio-only')
assert.equal(audioRule.audioName,'通知.mp3')
assert.equal(mappings.resolveMappingVoice(audioRule).audioId,'saved-file')
assert.equal(mappings.matchVoiceMapping('请播放', [audioRule]).id,'audio-only')
console.log('PASS: file-only playback, audio-only mapping persistence, no network, alarm ordering, cancellation and missing-file error')
