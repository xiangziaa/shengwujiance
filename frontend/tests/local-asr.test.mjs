import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'

let releaseMicrophone, stopped = 0, closed = 0, processor, posted = 0
const stream = { getTracks: () => [{ stop: () => stopped++ }] }
const exports = {}
const code = ts.transpileModule(readFileSync(new URL('../src/utils/localAsr.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
class AudioContext {
  sampleRate = 48000
  async resume() {}
  async close() { closed++ }
  createMediaStreamSource() { return { connect() {}, disconnect() {} } }
  createScriptProcessor() { return processor = { connect() {}, disconnect() {} } }
}
vm.runInNewContext(code, { exports, AbortController, AbortSignal, DOMException, AudioContext,
  window: { AudioContext }, navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { releaseMicrophone = resolve }) } },
  fetch: async (url, options) => {
    assert.ok(url.startsWith('http://127.0.0.1:8767/'))
    if (url.endsWith('/recognize')) { posted++; assert.ok(options.body.byteLength >= 3200); return { ok: true, json: async () => ({ text: '异常预警' }) } }
    return { ok: true }
  },
})
const tick = () => new Promise(resolve => setImmediate(resolve))
const cancelled = new exports.LocalRecognition()
cancelled.start(); await tick(); cancelled.abort(); releaseMicrophone(stream); await tick()
assert.equal(stopped, 1, 'late microphone permission must release tracks after cancel')
const recognition = new exports.LocalRecognition()
let text, ended = 0
recognition.onresult = event => { text = event.results[0][0].transcript }
recognition.onend = () => ended++
recognition.start(); await tick(); releaseMicrophone(stream); await tick()
const frame = value => processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(4096).fill(value) } })
for (let i = 0; i < 5; i++) frame(0.1)
for (let i = 0; i < 8; i++) frame(0)
await tick()
assert.equal(posted, 1)
assert.equal(text, '异常预警')
assert.equal(ended, 1)
assert.equal(stopped, 2)
assert.equal(closed, 1)
assert.equal(processor.onaudioprocess, null)
console.log('PASS: local-only ASR, PCM segmentation, result delivery, cancellation and microphone cleanup')
