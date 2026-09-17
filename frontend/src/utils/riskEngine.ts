import type { AnalysisRiskLevel, RiskAssessment, ToxinResult, ToxinResultInput } from '../types'

function scoreLevel(score: number): AnalysisRiskLevel {
  if (score >= 80) return '危险'
  if (score >= 55) return '预警'
  if (score >= 30) return '关注'
  return '安全'
}

function enrichToxin(input: ToxinResultInput): ToxinResult {
  const ratio = (input.value / input.limit) * 100
  return {
    ...input,
    ratio,
    nearLimit: ratio >= 80 && ratio <= 100,
    legallyCompliant: ratio <= 100,
    riskLabel: ratio > 100 ? '超标' : ratio >= 80 ? '预警' : ratio >= 50 ? '关注' : '低风险',
  }
}

export function assessToxinRisk(inputs: ToxinResultInput[]): RiskAssessment {
  const toxins = inputs.map(enrichToxin)
  const map = new Map(toxins.map((toxin) => [toxin.key, toxin]))
  const synergyRules: string[] = []
  const reasons: string[] = []
  let score = Math.round(Math.max(...toxins.map((toxin) => toxin.ratio)) * 0.55)

  const don = map.get('DON')
  const zen = map.get('ZEN')
  if (don && zen && don.value > 0 && zen.value > 0 && (don.ratio >= 50 || zen.ratio >= 50)) {
    synergyRules.push('DON 与 ZEN 同时检出，且至少一项达到限值的 50%，触发协同风险上调。')
    score += 13
  }

  const afb1 = map.get('AFB1')
  const fb = map.get('FB')
  if (afb1 && fb && afb1.ratio >= 50 && fb.ratio >= 50) {
    synergyRules.push('AFB₁ 与 FB 同时达到限值的 50%，触发协同风险上调。')
    score += 12
  }

  const aboveHalf = toxins.filter((toxin) => toxin.ratio >= 50)
  const multiToxin = aboveHalf.length >= 3
  if (multiToxin) {
    synergyRules.push('三种及以上毒素达到各自限值的 50%，标记为多毒素共存风险。')
    score += 12
  }

  toxins
    .filter((toxin) => toxin.ratio >= 50)
    .sort((a, b) => b.ratio - a.ratio)
    .forEach((toxin) => reasons.push(`${toxin.name}达到限值的 ${toxin.ratio.toFixed(1)}%`))
  reasons.push(...synergyRules)

  score = Math.min(100, Math.max(0, score))
  // 协同风险已通过附加分体现，最终等级统一按总分映射，避免重复上调。
  const level = scoreLevel(score)
  const legallyCompliant = toxins.every((toxin) => toxin.legallyCompliant)
  const actions = level === '危险'
    ? ['立即隔离当前批次', '按标准加密取样并启动复检', '由授权人员完成人工合规判定']
    : level === '预警'
      ? ['暂缓该批次入库流转', '优先复检 DON 与 ZEN', '保留原始数据并完成人工复核']
      : level === '关注'
        ? ['增加批次抽检频次', '关注来源区域后续样本', '按流程完成人工复核']
        : ['按常规流程归档', '保持例行监测频次']

  return { score, level, reasons, actions, synergyRules, multiToxin, legallyCompliant, toxins }
}
