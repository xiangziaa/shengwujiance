import type { ElisaResult, StandardPoint } from '../types'

export interface LinearFit {
  slope: number
  intercept: number
  r2: number
  predict: (concentration: number) => number
  inverse: (od: number) => number
}

export function linearRegression(points: StandardPoint[]): LinearFit {
  if (points.length < 2) {
    throw new Error('标准曲线至少需要两个有效数据点')
  }
  const n = points.length
  const sumX = points.reduce((sum, point) => sum + point.concentration, 0)
  const sumY = points.reduce((sum, point) => sum + point.od, 0)
  const sumXY = points.reduce((sum, point) => sum + point.concentration * point.od, 0)
  const sumXX = points.reduce((sum, point) => sum + point.concentration ** 2, 0)
  const denominator = n * sumXX - sumX ** 2
  if (denominator === 0) throw new Error('标准品浓度不能全部相同')

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n
  const meanY = sumY / n
  const residual = points.reduce((sum, point) => sum + (point.od - (slope * point.concentration + intercept)) ** 2, 0)
  const total = points.reduce((sum, point) => sum + (point.od - meanY) ** 2, 0)
  const r2 = total === 0 ? 1 : 1 - residual / total

  return {
    slope,
    intercept,
    r2,
    predict: (concentration) => slope * concentration + intercept,
    inverse: (od) => Math.max(0, (od - intercept) / slope),
  }
}

export function calculateElisa(points: StandardPoint[], sampleOdValues: number[]): ElisaResult {
  const fit = linearRegression(points)
  const averageOd = sampleOdValues.reduce((sum, value) => sum + value, 0) / sampleOdValues.length
  return {
    standardPoints: points,
    sampleOdValues,
    averageOd,
    r2: fit.r2,
    concentration: fit.inverse(averageOd),
    curveStatus: fit.r2 >= 0.99 ? 'qualified' : fit.r2 >= 0.95 ? 'review' : 'failed',
  }
}

export function createFitLine(points: StandardPoint[], segments = 40): StandardPoint[] {
  const fit = linearRegression(points)
  const maxX = Math.max(...points.map((point) => point.concentration))
  return Array.from({ length: segments + 1 }, (_, index) => {
    const concentration = (maxX * index) / segments
    return { concentration, od: Number(fit.predict(concentration).toFixed(4)) }
  })
}
