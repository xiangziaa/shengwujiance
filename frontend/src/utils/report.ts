import { reportBasis, reportResultsHtml, reportReviewConclusion, reportRiskConclusion } from '../mock/reportResults'
import type { Report, RiskAssessment, Sample } from '../types'

export interface ReportExportPayload {
  report: Report
  sample: Sample
  assessment: RiskAssessment
  /** Entry-stamped time; falls back to the report record when omitted. */
  generatedAt?: string
}

export function buildReportHtml({ report, sample, generatedAt }: ReportExportPayload): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${report.reportNo}</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:48px;color:#182230}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border:1px solid #d0d5dd;text-align:left}.meta{color:#667085}</style></head>
  <body><h1>粮食安全检测报告</h1><p class="meta">报告编号：${report.reportNo}</p><p class="meta">生成时间：${generatedAt ?? report.generatedAt}</p><h2>一、样本信息</h2><p>${sample.name} / ${sample.id} / ${sample.submitter}</p>
  <h2>二、检测结果</h2>${reportResultsHtml()}
  <h2>三、综合风险评估</h2><p>${reportRiskConclusion}</p>
  <h2>四、人工复核结论</h2><p>${reportReviewConclusion}</p>
  <p class="meta">${reportBasis}</p></body></html>`
}

export function downloadReport(payload: ReportExportPayload): void {
  const blob = new Blob([buildReportHtml(payload)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${payload.report.reportNo}.html`
  anchor.click()
  URL.revokeObjectURL(url)
}
