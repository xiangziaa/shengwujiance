import { Button, Progress, Segmented, Space, Table, Tag, message } from 'antd'
import { Activity, FlaskConical, Play, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeading } from '../components/common/PageHeading'
import { SectionPanel } from '../components/common/SectionPanel'
import { StatusTag } from '../components/common/StatusTag'
import { useAppStore } from '../store/useAppStore'
import type { Sample } from '../types'

export function DetectionQueuePage({ mode }: { mode: 'ELISA' | 'qPCR' }) {
  const navigate = useNavigate()
  const samples = useAppStore((state) => state.samples)
  const updateSampleStatus = useAppStore((state) => state.updateSampleStatus)
  const [scope, setScope] = useState('全部任务')
  const queue = samples.filter((sample) => sample.status === '检测中' || sample.status === '待判读').slice(0, 12)
  return (
    <div className="page detection-queue-page page-enter">
      <PageHeading title={`${mode} 分析`} description={mode === 'ELISA' ? '管理标准曲线批次、OD 原始值与定量分析任务' : '管理扩增任务、对照曲线与 Ct 判读队列'} actions={<Space><Button icon={<UploadCloud size={16} />} onClick={() => message.success(`${mode} 仪器文件已读取（演示）`)}>导入仪器数据</Button><Button type="primary" icon={<Play size={16} />} onClick={() => message.success('已启动新分析批次')}>新建分析批次</Button></Space>} />
      <div className="queue-kpis"><div><FlaskConical size={21} /><span><small>今日任务</small><b>28</b></span></div><div><Activity size={21} /><span><small>分析中</small><b>6</b></span></div><div><Progress type="circle" percent={92} size={45} /><span><small>曲线合格率</small><b>92%</b></span></div><div><Tag color="orange">4</Tag><span><small>需人工复核</small><b>4</b></span></div></div>
      <SectionPanel title={`${mode} 检测队列`} subtitle="点击样本进入曲线分析与综合判读详情" extra={<Segmented value={scope} onChange={setScope} options={['全部任务', '分析中', '待判读']} />}>
        <Table<Sample> rowKey="id" dataSource={queue} columns={[
          { title: '样本编号', dataIndex: 'id', render: (value: string) => <Button type="link" onClick={() => navigate(`/analysis/${value}`)}>{value}</Button> },
          { title: '样本名称', dataIndex: 'name' },
          { title: '检测批次', dataIndex: 'batchNo' },
          { title: mode === 'ELISA' ? 'OD 数据' : '孔位', render: (_, _row, index) => mode === 'ELISA' ? `${1.12 + index * 0.027}`.slice(0, 5) : `A${index + 1}` },
          { title: mode === 'ELISA' ? '标准曲线' : 'Ct 估算', render: (_, _row, index) => index % 4 === 0 ? <Tag color="orange">待复核</Tag> : <Tag color="green">{mode === 'ELISA' ? '合格' : (26.8 + index * 0.42).toFixed(2)}</Tag> },
          { title: '状态', dataIndex: 'status', render: (value: Sample['status']) => <StatusTag status={value} /> },
          { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => navigate(`/analysis/${row.id}`)}>分析详情</Button><Button type="link" onClick={() => { updateSampleStatus([row.id], '待判读'); message.success('已提交 AI 判读队列') }}>提交判读</Button></Space> },
        ]} />
      </SectionPanel>
    </div>
  )
}
