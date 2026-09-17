import { Breadcrumb, Button, message, Modal, Steps, Tag } from 'antd'
import { ArrowLeft, Bot, Building2, CalendarDays, CheckCircle2, FileText, Layers3, MapPin, PackageCheck, Send, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ElisaAnalysisCard } from '../components/analysis/ElisaAnalysisCard'
import { QpcrAnalysisCard } from '../components/analysis/QpcrAnalysisCard'
import { ReviewModal } from '../components/analysis/ReviewModal'
import { ToxinRiskPanel } from '../components/analysis/ToxinRiskPanel'
import { PageHeading } from '../components/common/PageHeading'
import { StatusTag } from '../components/common/StatusTag'
import { toxinResults } from '../mock/data'
import { useAppStore } from '../store/useAppStore'
import { assessToxinRisk } from '../utils/riskEngine'

export function AnalysisPage() {
  const { sampleId } = useParams()
  const navigate = useNavigate()
  const samples = useAppStore((state) => state.samples)
  const reviews = useAppStore((state) => state.reviews)
  const saveReview = useAppStore((state) => state.saveReview)
  const updateSampleStatus = useAppStore((state) => state.updateSampleStatus)
  const ensureReport = useAppStore((state) => state.ensureReport)
  const analysisNow = useAppStore((state) => state.reportNow)
  const refreshReportClock = useAppStore((state) => state.refreshReportClock)
  const [reviewOpen, setReviewOpen] = useState(false)
  const assessment = useMemo(() => assessToxinRisk(toxinResults), [])
  const sample = samples.find((item) => item.id === sampleId) ?? samples[0]

  // Share the report centre's clock and refresh on entry or sample changes.
  useEffect(() => { refreshReportClock() }, [refreshReportClock, sample.id])

  const submitJudgement = () => {
    Modal.confirm({
      title: '确认提交综合判读？',
      content: '提交后样本状态将更新为“待生成报告”，检测流程同步推进。',
      okText: '确认提交', cancelText: '继续检查',
      onOk: () => {
        refreshReportClock()
        updateSampleStatus([sample.id], '待生成报告')
        message.success('综合判读已提交，样本进入报告生成队列')
      },
    })
  }

  const generateReport = () => {
    refreshReportClock()
    const report = ensureReport(sample.id)
    if (!report) return
    message.success('检测报告已生成')
    navigate(`/reports?sampleId=${sample.id}`)
  }

  return (
    <div className="page analysis-page page-enter">
      <Breadcrumb items={[{ title: '首页' }, { title: 'AI 综合判读' }, { title: '样本分析详情' }]} />
      <PageHeading
        title={`样本分析详情 · ${sample.id}`}
        description={`检测批次 ${sample.batchNo} · 分析完成时间 ${analysisNow}`}
        actions={<><StatusTag status={sample.status} /><Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/samples')}>返回样本列表</Button></>}
      />

      <div className="sample-info-strip">
        <div><span className="info-icon"><PackageCheck size={19} /></span><small>样本名称</small><b>{sample.name}</b></div>
        <div><span className="info-icon"><Layers3 size={19} /></span><small>样本类型</small><b>粮食 · {sample.type}</b></div>
        <div><span className="info-icon"><MapPin size={19} /></span><small>样品来源</small><b>{sample.source}</b></div>
        <div><span className="info-icon"><Building2 size={19} /></span><small>送检单位</small><b>{sample.submitter}</b></div>
        <div><span className="info-icon"><CalendarDays size={19} /></span><small>采样时间</small><b>{sample.collectedAt}</b></div>
        <div><span className="info-icon success"><CheckCircle2 size={19} /></span><small>当前状态</small><b>{sample.status}</b></div>
      </div>

      <div className="analysis-progress">
        <Steps
          size="small" current={sample.status === '待生成报告' ? 5 : reviews[sample.id] ? 4 : 3}
          items={['样本登记', '快速筛查', 'ELISA / qPCR', 'AI 判读', '人工复核', '报告生成'].map((title) => ({ title }))}
        />
      </div>

      <div className="analysis-grid">
        <ElisaAnalysisCard />
        <QpcrAnalysisCard />
        <ToxinRiskPanel assessment={assessment} />
      </div>

      {reviews[sample.id] && (
        <section className="review-result-bar">
          <div><UserCheck size={20} /><span><strong>人工复核已完成</strong>{reviews[sample.id].reviewer} · {reviews[sample.id].reviewedAt}</span></div>
          <Tag color={reviews[sample.id].agreed ? 'green' : 'orange'}>{reviews[sample.id].agreed ? '同意算法结果' : '调整算法结果'}</Tag>
          <span>{reviews[sample.id].conclusion}：{reviews[sample.id].comment}</span>
        </section>
      )}

      <section className="analysis-action-bar">
        <div><Bot size={20} /><span><strong>综合判读已完成</strong>当前结论：内部风险 {assessment.level} · 法定限值项目{assessment.legallyCompliant ? '均未超限' : '存在超限'}</span></div>
        <Button size="large" icon={<UserCheck size={18} />} onClick={() => setReviewOpen(true)}>人工复核</Button>
        <Button size="large" icon={<FileText size={18} />} onClick={generateReport}>生成报告</Button>
        <Button type="primary" size="large" icon={<Send size={18} />} onClick={submitJudgement}>提交判读</Button>
      </section>

      <ReviewModal
        open={reviewOpen} existing={reviews[sample.id]} onClose={() => setReviewOpen(false)}
        onSubmit={(review) => { saveReview(sample.id, review); setReviewOpen(false); message.success('人工复核记录已保存') }}
      />
    </div>
  )
}
