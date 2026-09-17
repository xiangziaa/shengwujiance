import { useMemo } from 'react'

interface ReportQrCodeProps {
  /** Seed for the deterministic pattern; also shown as the verification code. */
  payload: string
  size?: number
  className?: string
  caption?: string
}

/**
 * A QR-*styled* verification mark for the report header.
 *
 * It reproduces what a reader recognises as a QR code — finder, timing and
 * alignment patterns plus dense data modules — but the data region is a
 * deterministic pseudo-random fill with no Reed-Solomon blocks, so scanning it
 * can never yield content. The pattern is seeded by the report number, so the
 * same report always renders the same mark (and it is safe to print).
 */
const MODULES = 25
const FINDER_ORIGINS: Array<[number, number]> = [[0, 0], [18, 0], [0, 18]]
const FINDER_SIZE = 7
const ALIGNMENT_ORIGIN: [number, number] = [16, 16]

function seedFrom(text: string) {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash || 0x9e3779b9
}

/** Small deterministic PRNG so the mark is stable across renders and reloads. */
function nextRandom(state: { value: number }) {
  state.value = (Math.imul(state.value, 1664525) + 1013904223) >>> 0
  return state.value / 0x100000000
}

/** Stable short code shown under the mark, e.g. LAZJ-2026-14015 -> 14015. */
export function verificationCodeFor(seed: string) {
  return seed.replace(/[^0-9A-Za-z]/g, '').slice(-6).toUpperCase() || 'LOCAL'
}

function buildMatrix(seed: string) {
  const grid: boolean[][] = Array.from({ length: MODULES }, () => Array.from({ length: MODULES }, () => false))
  const random = { value: seedFrom(seed) }

  const inFinder = (row: number, col: number) => FINDER_ORIGINS.some(([top, left]) =>
    row >= top - 1 && row < top + FINDER_SIZE + 1 && col >= left - 1 && col < left + FINDER_SIZE + 1)

  // Timing patterns
  for (let i = 8; i < MODULES - 8; i++) {
    grid[6][i] = i % 2 === 0
    grid[i][6] = i % 2 === 0
  }

  // Dense data region: deterministic noise, deliberately not a valid encoding.
  for (let row = 0; row < MODULES; row++) {
    for (let col = 0; col < MODULES; col++) {
      if (row === 6 || col === 6 || inFinder(row, col)) continue
      grid[row][col] = nextRandom(random) < 0.47
    }
  }

  // Finder patterns (outer ring, inner gap, 3x3 core)
  for (const [top, left] of FINDER_ORIGINS) {
    for (let r = 0; r < FINDER_SIZE; r++) {
      for (let c = 0; c < FINDER_SIZE; c++) {
        const edge = r === 0 || r === FINDER_SIZE - 1 || c === 0 || c === FINDER_SIZE - 1
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        grid[top + r][left + c] = edge || core
      }
    }
  }

  // Alignment pattern
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const edge = r === 0 || r === 4 || c === 0 || c === 4
      const core = r === 2 && c === 2
      grid[ALIGNMENT_ORIGIN[0] + r][ALIGNMENT_ORIGIN[1] + c] = edge || core
    }
  }

  return grid
}

export function ReportQrCode({ payload, size = 56, className = '', caption = '扫码验真' }: ReportQrCodeProps) {
  const { path, code } = useMemo(() => {
    const grid = buildMatrix(payload)
    const segments: string[] = []
    for (let row = 0; row < MODULES; row++) {
      for (let col = 0; col < MODULES; col++) {
        if (grid[row][col]) segments.push(`M${col} ${row}h1v1h-1z`)
      }
    }
    return { path: segments.join(''), code: verificationCodeFor(payload) }
  }, [payload])

  return (
    <figure className={`report-qr ${className}`.trim()} style={{ width: size }}>
      <svg viewBox={`-1 -1 ${MODULES + 2} ${MODULES + 2}`} width={size} height={size} role="img" aria-label={`报告验真码 ${code}（演示样式，不可扫描）`} shapeRendering="crispEdges">
        <rect x={-1} y={-1} width={MODULES + 2} height={MODULES + 2} fill="#fff" />
        <path d={path} fill="#182230" />
      </svg>
      <figcaption>
        <small>{caption}</small>
        <b>{code}</b>
      </figcaption>
    </figure>
  )
}
