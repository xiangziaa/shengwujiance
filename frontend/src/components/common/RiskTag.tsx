import { Tag } from 'antd'
import type { AnalysisRiskLevel, RiskLevel } from '../../types'

const colors: Record<RiskLevel | AnalysisRiskLevel, string> = {
  安全: 'green',
  低风险: 'green',
  关注: 'gold',
  中风险: 'orange',
  预警: 'volcano',
  高风险: 'red',
  危险: 'red',
}

export function RiskTag({ level }: { level: RiskLevel | AnalysisRiskLevel }) {
  return <Tag color={colors[level]} className="status-tag">{level}</Tag>
}
