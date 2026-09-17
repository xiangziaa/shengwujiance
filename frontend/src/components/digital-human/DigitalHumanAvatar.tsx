import { useEffect, useRef, useState } from 'react'

export function DigitalHumanAvatar({ speaking = false, className = '' }: { speaking?: boolean; className?: string }) {
  const [mouth, setMouth] = useState(0)
  const boundaryTime = useRef(0)
  useEffect(() => {
    // Preload every patch so the first syllable cannot flash an unloaded image.
    for (let i = 0; i < 4; i++) { const image = new Image(); image.src = `/xiaoan-mouth-${i}.webp` }
  }, [])
  useEffect(() => {
    setMouth(0)
    if (!speaking) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const boundary = () => { boundaryTime.current = performance.now() }
    window.addEventListener('xiaoan-speech-boundary', boundary)
    boundaryTime.current = 0
    const sequence = [0, 1, 2, 1, 0, 1, 3, 2, 1, 0, 0, 0]
    let index = 0
    const timer = window.setInterval(() => {
      // When the engine supplies word boundaries, close during a longer pause.
      const paused = boundaryTime.current > 0 && performance.now() - boundaryTime.current > 480
      setMouth(paused ? 0 : sequence[index++ % sequence.length])
    }, 85)
    return () => { window.clearInterval(timer); window.removeEventListener('xiaoan-speech-boundary', boundary); setMouth(0) }
  }, [speaking])
  return <svg viewBox="0 0 1024 1536" role="img" aria-label={`数字人小安${speaking ? '，正在说话' : ''}`} className={`xiaoan-avatar ${speaking ? 'is-speaking' : ''} ${className}`}>
    <image href="/digital-human-standing-clean.webp" width="1024" height="1536" />
    {speaking && mouth > 0 && <image href={`/xiaoan-mouth-${mouth}.webp`} x="463" y="389" width="87" height="47" />}
  </svg>
}
