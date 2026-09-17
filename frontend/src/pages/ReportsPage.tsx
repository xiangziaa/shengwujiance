import { Button, Empty, Input, message, Modal, Segmented, Space, Tag } from 'antd'
import { Download, Eye, FileSignature, FileText, Printer, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AiReportAssistant } from '../components/reports/AiReportAssistant'
import { ReportPreview } from '../components/reports/ReportPreview'
import { PageHeading } from '../components/common/PageHeading'
import { RiskTag } from '../components/common/RiskTag'
import { toxinResults } from '../mock/data'
import { useAppStore } from '../store/useAppStore'
import { getQpcrResult } from '../utils/qpcr'
import { assessToxinRisk } from '../utils/riskEngine'
import { downloadReport } from '../utils/report'

export function ReportsPage() {
  const [searchParams] = useSearchParams()
  const reports = useAppStore((state) => state.reports)
  const samples = useAppStore((state) => state.samples)
  const reviews = useAppStore((state) => state.reviews)
  const reportNow = useAppStore((state) => state.reportNow)
  const refreshReportClock = useAppStore((state) => state.refreshReportClock)
  const signReport = useAppStore((state) => state.signReport)
  const deleteReport = useAppStore((state) => state.deleteReport)
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? '')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'全部' | '待签字' | '已生成' | '已签字'>('全部')
  const assessment = useMemo(() => assessToxinRisk(toxinResults), [])
  const qpcr = useMemo(() => getQpcrResult('A1'), [])

  // Stamp the entry time once per visit instead of ticking every second.
  useEffect(() => { refreshReportClock() }, [refreshReportClock])

  useEffect(() => {
    const sampleId = searchParams.get('sampleId')
    const report = reports.find((item) => item.sampleId === sampleId)
    if (report) setSelectedId(report.id)
  }, [reports, searchParams])

  /** Every deliberate action re-stamps "生成时间" with the current clock. */
  const stampNow = useCallback(() => refreshReportClock(), [refreshReportClock])

  const selectReport = (id: string) => { stampNow(); setSelectedId(id) }

  const filteredReports = reports.filter((report) => {
    const matchKeyword = !keyword || report.reportNo.toLowerCase().includes(keyword.toLowerCase()) || report.sampleName.toLowerCase().includes(keyword.toLowerCase())
    return matchKeyword && (status === '全部' || report.status === status)
  })
  const selectedReport = reports.find((report) => report.id === selectedId) ?? reports[0]
  const sample = samples.find((item) => item.id === selectedReport?.sampleId) ?? samples[0]

  if (!selectedReport || !sample) return <Empty description="暂无检测报告" />

  const handleDownload = () => {
    stampNow()
    downloadReport({ report: selectedReport, sample, assessment, generatedAt: reportNow })
    message.success('HTML 检测报告已下载')
  }

  const handleSign = () => {
    stampNow()
    signReport(selectedReport.id)
    message.success('电子签字已完成')
  }

  const handleDelete = () => {
    Modal.confirm({ title: '删除这份报告？', content: '此操作只影响当前本地演示数据。', okText: '删除', okButtonProps: { danger: true }, onOk: () => { stampNow(); deleteReport(selectedReport.id); setSelectedId(reports.find((item) => item.id !== selectedReport.id)?.id ?? ''); message.success('报告已删除') } })
  }

  return (
    <div className="page reports-page page-enter">
      <PageHeading title="报告中心" description={`集中预览、签字、导出检测报告，并由助手解释当前结果 · 当前时间 ${reportNow}`} actions={
        <Space><Button icon={<Download size={16} />} onClick={handleDownload}>导出报告</Button><Button type="primary" icon={<Printer size={16} />} onClick={() => { stampNow(); window.print() }}>打印当前报告</Button></Space>
      } />
      <div className="report-toolbar">
        <Segmented value={status} onChange={(value) => setStatus(value as typeof status)} options={['全部', '待签字', '已生成', '已签字']} />
        <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<Search size={15} />} placeholder="搜索报告编号或样本名称" allowClear />
        <span>共 {filteredReports.length} 份报告 · 生成时间按本次进入刷新</span>
      </div>

      <div className="reports-workspace">
        <aside className="report-list-panel">
          <div className="report-list-head"><FileText size={18} /><strong>报告列表</strong><Tag>{filteredReports.length}</Tag></div>
          <div className="report-list-scroll">
            {filteredReports.map((report) => (
              <button key={report.id} className={report.id === selectedReport.id ? 'report-list-item active' : 'report-list-item'} onClick={() => selectReport(report.id)}>
                <div><span>{report.reportNo}</span><Tag color={report.status === '已签字' ? 'green' : report.status === '待签字' ? 'orange' : 'blue'}>{report.status}</Tag></div>
                <strong>{report.sampleName}</strong>
                <div><RiskTag level={report.riskLevel} /><small>{reportNow.slice(5, 16)}</small></div>
              </button>
            ))}
            {!filteredReports.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有符合条件的报告" />}
          </div>
          <div className="report-list-actions">
            <Button icon={<Eye size={15} />} onClick={stampNow}>预览</Button>
            <Button icon={<Download size={15} />} onClick={handleDownload}>下载</Button>
            <Button icon={<Printer size={15} />} onClick={() => { stampNow(); window.print() }}>打印</Button>
            <Button icon={<FileSignature size={15} />} disabled={selectedReport.status === '已签字'} onClick={handleSign}>签字</Button>
            <Button danger icon={<Trash2 size={15} />} onClick={handleDelete}>删除</Button>
          </div>
        </aside>

        <div className="report-preview-shell">
          <div className="preview-label"><span>报告预览</span><small>A4 · 100%</small></div>
          <ReportPreview report={selectedReport} sample={sample} assessment={assessment} review={reviews[sample.id]} generatedAt={reportNow} />
        </div>

        <AiReportAssistant report={selectedReport} assessment={assessment} qpcr={qpcr} />
      </div>
    </div>
  )
}
