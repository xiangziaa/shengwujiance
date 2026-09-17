// Reference: 样品检测结果汇总(1).xlsx, Sheet1!A1:D5.
export const reportElisaRows = [
  ['样品1', '119.781', '≤20', '高风险 预警'],
  ['样品2', '1.744', '≤20', '低风险'],
  ['样品3', '1.976', '≤20', '低风险'],
  ['样品4', '0.225', '≤20', '低风险'],
]
// Reference: qPCR.xlsx, Sheet1!A1:F5. B1:D1 is a merged CT header.
export const reportQpcrRows = [
  ['A组', '15.238', '15.223', '15.223', '阳性', '高风险 预警'],
  ['B组', '31.735', '31.737', '31.745', '阳性', '中风险'],
  ['C组', '40', '40', '40', '阴性', '低风险'],
  ['D组', '39.863', '39.799', '39.826', '阴性', '复核'],
]
export const reportRiskConclusion = '综合评估，该批次玉米样品存在黄曲霉污染风险，样品1检出黄曲霉且毒素超标，样品2、4检出黄曲霉但暂未产毒，需重点管控并及时复检。'
export const reportReviewConclusion = '建议对样品1进行复检，由授权人员结合现行检测标准给出最终结论。'
export const reportBasis = '检测依据：GB 2761—2017系列方法'

/** Shared by the on-screen preview, printing, and HTML export. */
export function reportResultsHtml() {
  const rows = (data: string[][]) => data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
  return `<h3>ELISA毒素检测结果</h3><table class="report-result-table"><thead><tr><th scope="col">样品编号</th><th scope="col">检测结果（µg/kg）</th><th scope="col">项目限值（µg/kg）</th><th scope="col">内部提示</th></tr></thead><tbody>${rows(reportElisaRows)}</tbody></table>
  <h3>qPCR霉菌检测结果</h3><table class="report-result-table"><thead><tr><th scope="col">样品编号</th><th colspan="3" scope="colgroup">CT值</th><th scope="col">检测结果</th><th scope="col">内部提示</th></tr></thead><tbody>${rows(reportQpcrRows)}</tbody></table>`
}
