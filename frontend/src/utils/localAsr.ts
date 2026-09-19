export const ASR_URL = 'http://127.0.0.1:8767'
export const localAsrSupported = () => !!navigator.mediaDevices?.getUserMedia && !!window.AudioContext

export interface RecognitionResult {
  resultIndex: number
  results: { isFinal: boolean; [index: number]: { transcript: string } }[]
}

/** Browser microphone -> utterance segmentation -> loopback-only Paraformer. */
export class LocalRecognition {
  lang = 'zh-CN'
  interimResults = false
  continuous = false
  onstart: (() => void) | null = null
  onresult: ((event: RecognitionResult) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  private active = false
  private controller?: AbortController
  private stream?: MediaStream
  private context?: AudioContext
  private processor?: ScriptProcessorNode
  private source?: MediaStreamAudioSourceNode
  private pending = false
  private chunks: Float32Array[] = []
  private preRoll: Float32Array[] = []
  private samples = 0
  private quiet = 0

  start() {
    if (this.active) throw new Error('Recognition already running')
    this.active = true
    this.controller = new AbortController()
    void this.open(this.controller)
  }

  private async open(controller: AbortController) {
    try {
      const health = await fetch(`${ASR_URL}/health`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]) })
      if (!health.ok) throw new Error('service')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      if (controller.signal.aborted) { stream.getTracks().forEach(track => track.stop()); return }
      this.stream = stream
      this.context = new AudioContext()
      await this.context.resume()
      if (controller.signal.aborted) return
      this.source = this.context.createMediaStreamSource(stream)
      // Silent output keeps capture running; no microphone audio is played back.
      this.processor = this.context.createScriptProcessor(4096, 1, 1)
      this.processor.onaudioprocess = event => this.capture(event.inputBuffer.getChannelData(0))
      this.source.connect(this.processor)
      this.processor.connect(this.context.destination)
      this.onstart?.()
    } catch (error) {
      if (!controller.signal.aborted) this.fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'not-allowed' : 'local-asr-unavailable')
    }
  }

  private capture(input: Float32Array) {
    if (!this.active || this.pending || !this.context) return
    const frame = new Float32Array(input)
    const rate = this.context.sampleRate
    const rms = Math.sqrt(frame.reduce((sum, value) => sum + value * value, 0) / frame.length)
    const voiced = rms > 0.012
    if (!this.chunks.length && !voiced) {
      this.preRoll.push(frame)
      while (this.preRoll.length * frame.length > rate * 0.25) this.preRoll.shift()
      return
    }
    if (!this.chunks.length) {
      this.chunks = this.preRoll
      this.preRoll = []
      this.samples = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    }
    this.chunks.push(frame)
    this.samples += frame.length
    this.quiet = voiced ? 0 : this.quiet + frame.length
    if (this.quiet >= rate * 0.6 || this.samples >= rate * 10) void this.submit(rate)
  }

  private async submit(rate: number) {
    const chunks = this.chunks
    const count = this.samples
    this.chunks = []; this.samples = 0; this.quiet = 0
    if (!count || !this.controller) return
    this.pending = true
    const signal = this.controller.signal
    const audio = new Float32Array(count)
    let offset = 0
    for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.length }
    const size = Math.floor(count * 16000 / rate)
    const pcm = new ArrayBuffer(size * 2)
    const view = new DataView(pcm)
    for (let i = 0; i < size; i++) {
      const start = Math.floor(i * rate / 16000)
      const end = Math.min(count, Math.max(start + 1, Math.floor((i + 1) * rate / 16000)))
      let sum = 0
      for (let j = start; j < end; j++) sum += audio[j]
      view.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, sum / (end - start))) * 32767), true)
    }
    try {
      const response = await fetch(`${ASR_URL}/recognize`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: pcm, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) })
      if (!response.ok) throw new Error('Recognition failed')
      const result = await response.json() as { text: string }
      if (!signal.aborted && result.text.trim()) {
        this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: result.text } }] })
        if (!this.continuous) this.abort()
      }
    } catch {
      if (!signal.aborted) this.fail('local-asr-unavailable')
    } finally { this.pending = false }
  }

  private fail(error: string) { this.onerror?.({ error }); this.abort() }
  stop() { this.abort() }
  abort() {
    if (!this.active) return
    this.active = false
    this.controller?.abort()
    if (this.processor) { this.processor.onaudioprocess = null; this.processor.disconnect() }
    this.source?.disconnect()
    this.stream?.getTracks().forEach(track => track.stop())
    void this.context?.close()
    this.chunks = []; this.preRoll = []; this.samples = 0; this.quiet = 0
    this.onend?.()
  }
}
