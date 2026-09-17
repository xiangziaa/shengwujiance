import { Button, Modal, Segmented, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import type { EChartsOption, ECElementEvent } from 'echarts'
import { AlertTriangle, Bot, ClipboardCheck, FileCheck2, FlaskConical, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EChart } from '../components/common/EChart'
import { PageHeading } from '../components/common/PageHeading'
import { RiskTag } from '../components/common/RiskTag'
import { SectionPanel } from '../components/common/SectionPanel'
import { MetricCard } from '../components/dashboard/MetricCard'
import { getRecentTrend } from '../mock/data'
import { useAppStore } from '../store/useAppStore'
import type { Sample } from '../types'

const processSteps = [
  { title: '样本登记', count: 128, status: '已完成', color: '#16B364' },
  { title: '快速筛查', count: 128, status: '已完成', color: '#16B364' },
  { title: 'ELISA / qPCR', count: 85, status: '进行中', color: '#2878FF' },
  { title: 'AI 判读', count: 72, status: '进行中', color: '#7A5AF8' },
  { title: '人工复核', count: 23, status: '待处理', color: '#F79009' },
  { title: '报告生成', count: 96, status: '已完成', color: '#344054' },
]

const suggestions = [
  { text: '近期玉米样本中 DON 检出比例上升，建议加强收购环节批次监测。', type: '风险预警' },
  { text: '豫北区域样本的 ZEN 关注级占比增高，建议增加该区域抽检频次。', type: '监测建议' },
  { text: '当前 ELISA 待测任务集中，建议将 23 个待复核批次优先排入今日复检。', type: '流程优化' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [updatedAt] = useState(() => dayjs().format('YYYY-MM-DD HH:mm'))
  const samples = useAppStore((state) => state.samples)
  const refreshDemoDates = useAppStore((state) => state.refreshDemoDates)
  useEffect(() => { refreshDemoDates() }, [refreshDemoDates])
  const [range, setRange] = useState<'近 7 天' | '近 30 天'>('近 7 天')
  const [daySummary, setDaySummary] = useState<{ date: string; total: number; positive: number } | null>(null)
  const [handled, setHandled] = useState<string[]>([])
  const trend = useMemo(() => getRecentTrend(range === '近 7 天' ? 7 : 30, dayjs(updatedAt)), [range, updatedAt])
  const highRisk = samples.filter((sample) => sample.riskLevel === '高风险').sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()).slice(0, 5)

  const trendOption = useMemo<EChartsOption>(() => ({
    color: ['#2878FF', '#16B364'],
    tooltip: { trigger: 'axis', backgroundColor: '#182230', borderWidth: 0, textStyle: { color: '#fff' } },
    legend: { top: 0, right: 0, icon: 'circle', itemWidth: 8, textStyle: { color: '#667085' } },
    grid: { left: 38, right: 14, top: 42, bottom: 24 },
    xAxis: { type: 'category', data: trend.map((item) => item.date), boundaryGap: false, axisLine: { lineStyle: { color: '#E4E7EC' } }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#EEF2F6', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: '检测样本数', type: 'line', smooth: 0.3, data: trend.map((item) => item.total), symbolSize: 7, areaStyle: { color: 'rgba(40,120,255,.08)' }, lineStyle: { width: 3 } },
      { name: '阳性样本数', type: 'line', smooth: 0.3, data: trend.map((item) => item.positive), symbolSize: 7, lineStyle: { width: 3 } },
    ],
  }), [trend])

  const riskOption = useMemo<EChartsOption>(() => ({
    color: ['#16B364', '#80CA7B', '#F7B955', '#F04438'],
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 份 · {d}%' },
    legend: { orient: 'horizontal', left: 'center', bottom: 10, width: '90%', icon: 'circle', itemWidth: 8, itemGap: 12, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['48%', '66%'], center: ['50%', '42%'], minAngle: 4,
      label: { show: false }, emphasis: { scaleSize: 7 },
      data: [
        { name: '安全', value: 237 },
        { name: '低风险', value: 114 },
        { name: '中风险', value: 89 },
        { name: '高风险', value: 36 },
      ],
    }],
    graphic: [{ type: 'text', left: 'center', top: '34%', style: { text: '476\n总样本', textAlign: 'center', fill: '#182230', fontSize: 16, fontWeight: 700, lineHeight: 24 } }],
  }), [])

  const handleTrendClick = (params: ECElementEvent) => {
    const item = trend.find((entry) => entry.date === String(params.name))
    if (item) setDaySummary(item)
  }

  return (
    <div className="page dashboard-page page-enter">
      <PageHeading
        eyebrow={`数据更新于 ${updatedAt}`}
        title="上午好，检验员"
        description="今日重点：7 个高风险样本与 23 个待复核任务"
        actions={<Button icon={<RefreshCw size={16} />} onClick={() => message.success('数据已刷新')}>刷新数据</Button>}
      />

      <div className="metric-grid stagger-enter">
        <MetricCard label="今日检测样本" value={128} unit="份" change={18.5} tone="blue" icon={<FlaskConical size={26} />} onClick={() => navigate('/samples?date=today')} />
        <MetricCard label="待复核" value={23} unit="份" change={9.1} tone="orange" icon={<ClipboardCheck size={26} />} onClick={() => navigate('/samples?status=待复核')} />
        <MetricCard label="高风险预警" value={7} unit="份" change={40} tone="red" icon={<ShieldAlert size={26} />} onClick={() => navigate('/samples?risk=高风险')} />
        <MetricCard label="报告生成数" value={96} unit="份" change={-6.8} tone="green" icon={<FileCheck2 size={26} />} onClick={() => navigate('/reports')} />
      </div>

      <div className="dashboard-primary-grid">
        <SectionPanel title="样本检测趋势" subtitle="阳性样本占比保持在内部监测阈值内" extra={<Segmented size="small" value={range} options={['近 7 天', '近 30 天']} onChange={(value) => setRange(value as typeof range)} />}>
          <EChart option={trendOption} height={285} onClick={handleTrendClick} />
        </SectionPanel>
        <SectionPanel title="风险等级分布" subtitle="点击分区下钻查看对应样本">
          <EChart option={riskOption} height={285} onClick={(params) => navigate(`/samples?risk=${encodeURIComponent(String(params.name))}`)} />
        </SectionPanel>
        <SectionPanel title="高风险样本" subtitle="按最新检测时间排序" extra={<Button type="link" onClick={() => navigate('/samples?risk=高风险')}>查看全部</Button>}>
          <Table<Sample>
            size="small" pagination={false} dataSource={highRisk} rowKey="id" scroll={{ x: 480 }}
            columns={[
              { title: '样本编号', dataIndex: 'id', render: (value: string) => <Button type="link" className="table-link" onClick={() => navigate(`/analysis/${value}`)}>{value}</Button> },
              { title: '样本名称', dataIndex: 'name', ellipsis: true },
              { title: '主要风险', render: (_, sample) => sample.testItems.includes('DON') ? 'DON / ZEN' : sample.testItems[0] },
              { title: '等级', dataIndex: 'riskLevel', render: (value: Sample['riskLevel']) => <RiskTag level={value} /> },
              { title: '检测时间', dataIndex: 'createdAt', render: (value: string) => value.slice(5) },
            ]}
          />
        </SectionPanel>
      </div>

      <div className="dashboard-bottom-grid">
        <SectionPanel title="检测流程进度" subtitle="从样本登记到报告生成的今日任务流">
          <div className="process-flow">
            {processSteps.map((step, index) => (
              <button key={step.title} className="process-step" onClick={() => navigate(index < 2 ? index === 0 ? '/samples' : '/screening' : index < 4 ? `/analysis/${samples[0].id}` : index === 4 ? '/samples?status=待复核' : '/reports')}>
                <span className="process-node" style={{ '--step-color': step.color } as React.CSSProperties}>{index < 2 ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <strong>{step.title}</strong><b>{step.count}<small> 份</small></b><span>{step.status}</span>
              </button>
            ))}
          </div>
        </SectionPanel>
        <SectionPanel title="AI 智能建议" subtitle="基于近 30 天内部监测数据" extra={<Sparkles size={18} color="#7A5AF8" />}>
          <div className="suggestion-list">
            {suggestions.map((suggestion, index) => (
              <div key={suggestion.text} className={handled.includes(suggestion.text) ? 'suggestion handled' : 'suggestion'}>
                <span className="suggestion-icon">{index === 0 ? <AlertTriangle size={17} /> : <Bot size={17} />}</span>
                <p>{suggestion.text}</p>
                {handled.includes(suggestion.text) ? <Tag color="green">已关注</Tag> : <Button type="link" onClick={() => setHandled((current) => [...current, suggestion.text])}>标记关注</Button>}
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <Modal title={`${daySummary?.date ?? ''} 样本摘要`} open={Boolean(daySummary)} onCancel={() => setDaySummary(null)} footer={<Button type="primary" onClick={() => { setDaySummary(null); navigate('/samples') }}>查看当天样本</Button>}>
        <div className="day-summary"><span><b>{daySummary?.total}</b>检测样本</span><span><b>{daySummary?.positive}</b>阳性样本</span><span><b>{daySummary ? ((daySummary.positive / daySummary.total) * 100).toFixed(1) : 0}%</b>阳性率</span></div>
      </Modal>
    </div>
  )
}
