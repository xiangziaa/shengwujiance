export type SampleStatus =
  | '待登记'
  | '待筛查'
  | '检测中'
  | '待判读'
  | '待复核'
  | '待生成报告'
  | '已完成'

export type RiskLevel = '安全' | '低风险' | '中风险' | '高风险'
export type AnalysisRiskLevel = '安全' | '关注' | '预警' | '危险'
export type CurveQuality = '正常' | '可疑' | '异常'

export interface Sample {
  id: string
  name: string
  type: string
  source: string
  submitter: string
  batchNo: string
  weight: number
  collectedAt: string
  createdAt: string
  status: SampleStatus
  riskLevel: RiskLevel
  testItems: string[]
  note?: string
}

export interface StandardPoint {
  concentration: number
  od: number
}

export interface ElisaResult {
  standardPoints: StandardPoint[]
  sampleOdValues: number[]
  averageOd: number
  r2: number
  concentration: number
  curveStatus: 'qualified' | 'review' | 'failed'
}

export interface QpcrCurve {
  cycle: number
  fluorescence: number
}

export interface QpcrResult {
  targetGene: string
  ctValue: number | null
  result: '阳性' | '阴性' | '可疑'
  efficiency: number
  baselineNoise: number
  maxSlope: number
  hasPlateau: boolean
  curveQuality: CurveQuality
  curve: QpcrCurve[]
}

export interface ToxinResultInput {
  key: string
  name: string
  value: number
  limit: number
  unit: string
}

export interface ToxinResult extends ToxinResultInput {
  ratio: number
  nearLimit: boolean
  riskLabel: '低风险' | '关注' | '预警' | '超标'
  legallyCompliant: boolean
}

export interface RiskAssessment {
  score: number
  level: AnalysisRiskLevel
  reasons: string[]
  actions: string[]
  synergyRules: string[]
  multiToxin: boolean
  legallyCompliant: boolean
  toxins: ToxinResult[]
}

export interface ReviewRecord {
  reviewer: string
  agreed: boolean
  conclusion: string
  comment: string
  reviewedAt: string
}

export type ReportStatus = '待签字' | '已生成' | '已签字'

export interface Report {
  id: string
  sampleId: string
  reportNo: string
  sampleName: string
  riskLevel: RiskLevel
  status: ReportStatus
  generatedAt: string
  reviewer: string
}

export interface KnowledgeArticle {
  id: string
  title: string
  category: '国家标准' | '检测方法' | '毒素知识' | '仪器操作' | '异常案例' | '处置建议'
  summary: string
  updatedAt: string
  readMinutes: number
  content: string[]
}
