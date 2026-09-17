import type { QpcrCurve, QpcrResult } from '../types'

export type WellId = 'A1' | 'A2' | 'A3' | '阳性对照' | '阴性对照'

interface CurveProfile {
  midpoint: number
  amplitude: number
  growth: number
  noise: number
  baseline: number
}

const profiles: Record<WellId, CurveProfile> = {
  A1: { midpoint: 27.6, amplitude: 1180, growth: 0.47, noise: 1.8, baseline: 8 },
  A2: { midpoint: 31.2, amplitude: 920, growth: 0.41, noise: 3.8, baseline: 9 },
  A3: { midpoint: 35.8, amplitude: 430, growth: 0.31, noise: 7.2, baseline: 11 },
  阳性对照: { midpoint: 18.4, amplitude: 1380, growth: 0.55, noise: 1.2, baseline: 7 },
  阴性对照: { midpoint: 60, amplitude: 8, growth: 0.1, noise: 2.2, baseline: 8 },
}

// Mock 荧光单位下的阈值位于 S 型曲线指数增长段，可使 Ct 接近曲线中点。
export const QPCR_THRESHOLD = 550

export function generateQpcrCurve(well: WellId): QpcrCurve[] {
  const profile = profiles[well]
  return Array.from({ length: 40 }, (_, index) => {
    const cycle = index + 1
    const logistic = profile.amplitude / (1 + Math.exp(-profile.growth * (cycle - profile.midpoint)))
    const deterministicNoise = (Math.sin(cycle * 2.41) + Math.cos(cycle * 1.17)) * profile.noise
    return { cycle, fluorescence: Number(Math.max(0, profile.baseline + logistic + deterministicNoise).toFixed(2)) }
  })
}

export function analyzeQpcrCurve(curve: QpcrCurve[], threshold = QPCR_THRESHOLD): QpcrResult {
  const crossingIndex = curve.findIndex((point) => point.fluorescence >= threshold)
  let ctValue: number | null = null
  if (crossingIndex > 0) {
    const previous = curve[crossingIndex - 1]
    const current = curve[crossingIndex]
    const ratio = (threshold - previous.fluorescence) / (current.fluorescence - previous.fluorescence)
    ctValue = Number((previous.cycle + ratio).toFixed(2))
  }

  const differences = curve.slice(1).map((point, index) => point.fluorescence - curve[index].fluorescence)
  const maxSlope = Math.max(...differences)
  const baselineValues = curve.slice(0, 10).map((point) => point.fluorescence)
  const baselineMean = baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length
  const baselineNoise = Math.sqrt(
    baselineValues.reduce((sum, value) => sum + (value - baselineMean) ** 2, 0) / baselineValues.length,
  )
  const lateDifferences = differences.slice(-5)
  const lateSlope = lateDifferences.reduce((sum, value) => sum + Math.abs(value), 0) / lateDifferences.length
  const hasPlateau = crossingIndex === -1 || lateSlope < Math.max(6, maxSlope * 0.12)

  const suspicious = baselineNoise > 7 || (ctValue !== null && ctValue >= 34) || (ctValue !== null && !hasPlateau)
  const abnormal = baselineNoise > 11 || (ctValue !== null && maxSlope < 20)
  const curveQuality: QpcrResult['curveQuality'] = abnormal ? '异常' : suspicious ? '可疑' : '正常'
  const result: QpcrResult['result'] = ctValue === null ? '阴性' : ctValue < 34 ? '阳性' : '可疑'

  return {
    targetGene: 'Tri5',
    ctValue,
    result,
    efficiency: Number(Math.min(99.5, 90 + maxSlope / 18).toFixed(1)),
    baselineNoise: Number(baselineNoise.toFixed(2)),
    maxSlope: Number(maxSlope.toFixed(2)),
    hasPlateau,
    curveQuality,
    curve,
  }
}

export function getQpcrResult(well: WellId): QpcrResult {
  return analyzeQpcrCurve(generateQpcrCurve(well))
}
