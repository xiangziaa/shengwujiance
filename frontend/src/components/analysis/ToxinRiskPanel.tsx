import { Alert, Progress, Table, Tag } from 'antd'
import { AlertTriangle, CheckCircle2, Scale, ShieldAlert, Sparkles } from 'lucide-react'
import type { RiskAssessment, ToxinResult } from '../../types'
import { RiskTag } from '../common/RiskTag'
import { SectionPanel } from '../common/SectionPanel'

export function ToxinRiskPanel({ assessment }: { assessment: RiskAssessment }) {
  const progressColor = assessment.level === '危险' ? '#F04438' : assessment.level === '预警' ? '#F79009' : assessment.level === '关注' ? '#F7B955' : '#16B364'
  return (
    <SectionPanel className="analysis-module toxin-module" title="六毒素综合判读" subtitle="法定合规判定与内部风险预警分层展示" extra={<RiskTag level={assessment.level} />}>
      <Table<ToxinResult>
        rowKey="key" size="small" pagination={false} dataSource={assessment.toxins}
        columns={[
          { title: '毒素名称', dataIndex: 'name', width: 170, render: (value: string, row) => <span><b>{row.key}</b><small>{value}</small></span> },
          { title: '检测结果', render: (_, row) => <b>{row.value} <small>{row.unit}</small></b> },
          { title: '项目限值', render: (_, row) => `${row.limit} ${row.unit}` },
          { title: '占限值', dataIndex: 'ratio', render: (value: number) => <div className="ratio-cell"><Progress percent={Math.min(100, value)} showInfo={false} size="small" strokeColor={value >= 100 ? '#F04438' : value >= 80 ? '#F79009' : value >= 50 ? '#F7B955' : '#16B364'} /><span>{value.toFixed(1)}%</span></div> },
          { title: '接近限值', dataIndex: 'nearLimit', render: (value: boolean) => <Tag color={value ? 'orange' : 'green'}>{value ? '是' : '否'}</Tag> },
          { title: '单项风险', dataIndex: 'riskLabel', render: (value: ToxinResult['riskLabel']) => <Tag color={value === '超标' ? 'red' : value === '预警' ? 'volcano' : value === '关注' ? 'orange' : 'green'}>{value}</Tag> },
        ]}
      />

      <div className="risk-summary-grid">
        <div className="risk-score-card">
          <div className="risk-score-title"><Scale size={18} /> 综合风险评分</div>
          <div className="risk-score-number"><b>{assessment.score}</b><span>/100</span><RiskTag level={assessment.level} /></div>
          <Progress percent={assessment.score} showInfo={false} strokeColor={progressColor} trailColor="#EAECF0" />
          <p>该分值用于内部监测优先级排序，不等同于法定合规结果。</p>
        </div>
        <div className="legal-card">
          <div>{assessment.legallyCompliant ? <CheckCircle2 size={22} /> : <ShieldAlert size={22} />}</div>
          <strong>法定限值判定</strong>
          <b>{assessment.legallyCompliant ? '所列项目未超限值' : '存在超限项目，须复核'}</b>
          <span>以当前样本类别与页面所列项目限值为依据</span>
        </div>
      </div>

      <div className="ai-risk-card">
        <div className="ai-risk-title"><Sparkles size={18} /><strong>AI 风险提示</strong><Tag color="red">协同风险</Tag></div>
        <p>{assessment.synergyRules[0] ?? '当前未触发协同风险规则。'}</p>
        <ul>{assessment.actions.map((action) => <li key={action}>{action}</li>)}</ul>
      </div>
      <Alert icon={<AlertTriangle size={18} />} showIcon type="warning" message="综合风险评分仅用于辅助监测和复检决策，最终结论应以检测标准和人工复核结果为准。" />
    </SectionPanel>
  )
}
