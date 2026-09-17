import { Alert, Button, InputNumber, message, Modal, Select, Space, Steps, Table, Tag, Upload } from 'antd'
import type { UploadProps } from 'antd'
import { FileUp, FlaskConical, Plus, Send, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeading } from '../components/common/PageHeading'
import { SectionPanel } from '../components/common/SectionPanel'
import { useAppStore } from '../store/useAppStore'
import type { ToxinResultInput } from '../types'

const initialScreening: ToxinResultInput[] = [
  { key: 'AFB1', name: '黄曲霉毒素 B₁', value: 5.2, limit: 20, unit: 'μg/kg' },
  { key: 'DON', name: '脱氧雪腐镰刀菌烯醇', value: 860, limit: 1000, unit: 'μg/kg' },
  { key: 'ZEN', name: '玉米赤霉烯酮', value: 192, limit: 350, unit: 'μg/kg' },
  { key: 'OTA', name: '赭曲霉毒素 A', value: 1.7, limit: 5, unit: 'μg/kg' },
  { key: 'FB', name: '伏马毒素', value: 310, limit: 2000, unit: 'μg/kg' },
  { key: 'T2', name: 'T-2 毒素', value: 24, limit: 100, unit: 'μg/kg' },
]

export function ScreeningPage() {
  const navigate = useNavigate()
  const samples = useAppStore((state) => state.samples)
  const updateSampleStatus = useAppStore((state) => state.updateSampleStatus)
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? '')
  const [values, setValues] = useState(initialScreening)
  const [step, setStep] = useState(1)
  const selectedSample = samples.find((sample) => sample.id === sampleId)
  const abnormalCount = useMemo(() => values.filter((item) => item.value / item.limit >= 0.8).length, [values])

  const importProps: UploadProps = {
    accept: '.csv', showUploadList: false,
    beforeUpload: () => {
      message.loading({ key: 'screening-upload', content: '正在解析仪器 CSV…' })
      window.setTimeout(() => {
        setValues(initialScreening.map((item, index) => ({ ...item, value: Number((item.value * (1 + index * 0.006)).toFixed(2)) })))
        setStep(2)
        message.success({ key: 'screening-upload', content: '已读取 6 个初筛项目' })
      }, 700)
      return false
    },
  }

  const sendToRecheck = () => {
    Modal.confirm({ title: '送往 ELISA / qPCR 复检？', content: `已识别 ${abnormalCount} 个异常或接近阈值项目，将创建复检任务并更新样本状态。`, okText: '确认送检', onOk: () => {
      updateSampleStatus([sampleId], '检测中')
      setStep(3)
      message.success('复检任务已创建')
      window.setTimeout(() => navigate(`/analysis/${sampleId}`), 450)
    } })
  }

  return (
    <div className="page screening-page page-enter">
      <PageHeading title="快速筛查" description="录入六种毒素初筛结果，识别异常后送往定量复检" actions={<Button type="primary" icon={<Plus size={16} />} onClick={() => { setValues(initialScreening.map((item) => ({ ...item, value: 0 }))); setStep(0); message.success('已创建空白筛查任务') }}>创建筛查任务</Button>} />
      <div className="screening-overview">
        <Steps current={step} items={[{ title: '选择样本' }, { title: '录入结果' }, { title: '异常识别' }, { title: '送往复检' }]} />
      </div>
      <div className="screening-grid">
        <SectionPanel title="任务信息" subtitle="当前操作仅更新本地演示状态">
          <div className="screening-form">
            <label>选择样本<Select showSearch optionFilterProp="label" value={sampleId} onChange={(value) => { setSampleId(value); setStep(Math.max(step, 1)) }} options={samples.map((sample) => ({ value: sample.id, label: `${sample.id} · ${sample.name}` }))} /></label>
            <div className="selected-sample-summary"><span><small>样本名称</small><b>{selectedSample?.name}</b></span><span><small>送检单位</small><b>{selectedSample?.submitter}</b></span><span><small>当前状态</small><b>{selectedSample?.status}</b></span></div>
            <Space wrap><Upload {...importProps}><Button icon={<FileUp size={16} />}>模拟上传仪器 CSV</Button></Upload><Button icon={<WandSparkles size={16} />} onClick={() => { setValues(initialScreening); setStep(2); message.success('已填充竞赛演示数据') }}>填充演示数据</Button></Space>
          </div>
        </SectionPanel>
        <SectionPanel title="异常识别" subtitle="达到项目限值 80% 即进入复检优先队列">
          <div className={`screening-risk-indicator ${abnormalCount ? 'warning' : 'safe'}`}><FlaskConical size={28} /><b>{abnormalCount}</b><span>项需重点复检</span></div>
          <Alert type={abnormalCount ? 'warning' : 'success'} showIcon message={abnormalCount ? '已发现接近限值项目，请核对录入结果后送往复检。' : '当前未发现接近限值项目。'} />
        </SectionPanel>
      </div>
      <SectionPanel title="六毒素初筛结果" subtitle="支持直接修改数值，异常标记随输入实时更新" extra={<Button type="primary" icon={<Send size={16} />} disabled={!sampleId} onClick={sendToRecheck}>送往复检</Button>}>
        <Table<ToxinResultInput> rowKey="key" pagination={false} dataSource={values} columns={[
          { title: '毒素缩写', dataIndex: 'key', width: 110, render: (value: string) => <b>{value}</b> },
          { title: '毒素名称', dataIndex: 'name' },
          { title: '初筛结果', render: (_, row) => <InputNumber value={row.value} min={0} precision={2} addonAfter={row.unit} onChange={(value) => { setValues((current) => current.map((item) => item.key === row.key ? { ...item, value: Number(value ?? 0) } : item)); setStep(2) }} /> },
          { title: '项目限值', render: (_, row) => `${row.limit} ${row.unit}` },
          { title: '占限值', render: (_, row) => `${((row.value / row.limit) * 100).toFixed(1)}%` },
          { title: '系统标记', render: (_, row) => row.value / row.limit >= 0.8 ? <Tag color="red">优先复检</Tag> : row.value / row.limit >= 0.5 ? <Tag color="orange">关注</Tag> : <Tag color="green">正常</Tag> },
        ]} />
      </SectionPanel>
    </div>
  )
}
