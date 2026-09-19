/** Persist user-selected audio locally, without a server or network request. */
function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xiaoan-audio-files', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('files')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('无法打开本地音频存储，请检查浏览器权限。'))
  })
}
export async function saveAudioFile(file: File): Promise<string> {
  if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('请选择非空音频文件，大小不超过 50 MB。')
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(file.name)) throw new Error('请选择音频文件。')
  const url = URL.createObjectURL(file)
  try {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio()
      const timer = window.setTimeout(() => finish(new Error('音频读取超时，请换一个文件。')), 10000)
      const finish = (error?: Error) => { window.clearTimeout(timer); audio.onloadedmetadata = null; audio.onerror = null; audio.removeAttribute('src'); audio.load(); error ? reject(error) : resolve() }
      audio.onloadedmetadata = () => finish()
      audio.onerror = () => finish(new Error('浏览器无法播放这个音频，请使用 MP3 或 WAV。'))
      audio.preload = 'metadata'; audio.src = url
    })
  } finally { URL.revokeObjectURL(url) }
  const db = await openAudioDb()
  const id = crypto.randomUUID()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite')
      tx.objectStore('files').put(file, id)
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () => reject(new Error('音频保存失败，请检查本地存储空间。'))
    })
  } finally { db.close() }
  return id
}
export async function readAudioFile(id: string): Promise<Blob> {
  const db = await openAudioDb()
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id)
      request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('音频文件不存在，请在小安设置中重新选择文件。'))
      request.onerror = () => reject(new Error('读取本地音频失败。'))
    })
  } finally { db.close() }
}
