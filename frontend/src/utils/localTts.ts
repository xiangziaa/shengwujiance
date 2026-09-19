export const TTS_URL = 'http://127.0.0.1:8765'
export async function prepareLocalSpeech(text: string, voice: string, rate: number) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 610000)
  try {
    const response = await fetch(`${TTS_URL}/prepare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ text, voice, rate }),
    })
    if (!response.ok) throw new Error('预生成失败，请确认本地服务和所选模型已启动，再重试保存。')
    const result = await response.json()
    if (result.ready !== true) throw new Error('语音文件未保存成功。')
    return result as { ready: true; reused: boolean; file: string }
  } finally { window.clearTimeout(timer) }
}
export interface LocalVoice { id: string; name: string; engine?: string }
export async function getLocalVoices(signal: AbortSignal): Promise<LocalVoice[]> {
  const response = await fetch(`${TTS_URL}/health`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('本地 TTS 模型未就绪，请检查服务窗口。')
  const data = await response.json()
  if (data.service !== 'xiaoan-local-tts' || !Array.isArray(data.voices) || !data.voices.length) throw new Error('本地 TTS 服务版本不匹配或没有可用模型，请重启服务。')
  return data.voices
}
