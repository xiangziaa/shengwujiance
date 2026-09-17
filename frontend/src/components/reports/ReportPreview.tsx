import { Divider } from 'antd'
import { CheckCircle2, Wheat } from 'lucide-react'
import type { Report, RiskAssessment, ReviewRecord, Sample } from '../../types'
import { RiskTag } from '../common/RiskTag'
import { ReportQrCode } from './ReportQrCode'
import { reportBasis, reportResultsHtml, reportReviewConclusion, reportRiskConclusion } from '../../mock/reportResults'

interface ReportPreviewProps {
  report: Report
  sample: Sample
  assessment: RiskAssessment
  review?: ReviewRecord
  /** Entry-stamped time shown as 生成时间; falls back to the stored value. */
  generatedAt?: string
}

export function ReportPreview({ report, sample, assessment, generatedAt }: ReportPreviewProps) {
  const stamp = generatedAt ?? report.generatedAt
  return (
    <article className="report-paper" id="report-print-area">
      <header className="report-paper-head">
        <div className="report-paper-brand"><span><Wheat size={25} /></span><div><b>粮安智检 2.0</b><small>GRAIN SAFETY INSPECTION</small></div></div>
        <div><h1>粮食安全检测报告</h1><p>GRAIN SAFETY TEST REPORT</p></div>
        <ReportQrCode payload={`${report.reportNo}|${sample.id}|${sample.batchNo}`} caption="扫码验真" />
      </header>
      <div className="report-no"><span>报告编号：<b>{report.reportNo}</b></span><span>生成时间：{stamp}</span></div>

      <h2>一、样本信息</h2>
      <div className="report-info-table">
        <span>样本名称</span><b>{sample.name}</b><span>样本编号</span><b>{sample.id}</b>
        <span>样本来源</span><b>{sample.source}</b><span>批次编号</span><b>{sample.batchNo}</b>
        <span>送检单位</span><b>{sample.submitter}</b><span>样本重量</span><b>{sample.weight.toFixed(2)} kg</b>
      </div>

      <h2>二、检测结果</h2>
      <div className="report-detection-results" dangerouslySetInnerHTML={{ __html: reportResultsHtml() }} />

      <h2>三、综合风险评估</h2>
      <div className="report-risk-box">
        <RiskTag level={assessment.level} />
        <p>{reportRiskConclusion}</p>
      </div>

      <h2>四、人工复核结论</h2>
      <div className="report-review-line"><CheckCircle2 size={18} /><span>{reportReviewConclusion}</span></div>

      <Divider />
      <div className="report-basis"><span>{reportBasis}</span><span>报告状态：{report.status}</span></div>
      <footer className="report-signatures">
        <span>检测人：<b>检验员1</b></span><span>审核人：<b>{report.reviewer}</b></span><span>批准人：<b>王主任</b></span>
        <div className="report-stamp">粮安智检<br />检测专用章</div>
      </footer>
    </article>
  )
}
