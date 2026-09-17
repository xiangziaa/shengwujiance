import {
  Button, DatePicker, Dropdown, Empty, Form, Input, InputNumber, message, Modal, Popconfirm,
  Select, Space, Table, Upload,
} from 'antd'
import type { TableColumnsType, UploadProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Download, FileUp, MoreHorizontal, Plus, Search, Settings2, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeading } from '../components/common/PageHeading'
import { RiskTag } from '../components/common/RiskTag'
import { SectionPanel } from '../components/common/SectionPanel'
import { StatusTag } from '../components/common/StatusTag'
import { useAppStore } from '../store/useAppStore'
import type { RiskLevel, Sample, SampleStatus } from '../types'

interface FilterValues {
  keyword?: string
  type?: string
  submitter?: string
  riskLevel?: RiskLevel
  status?: SampleStatus
  dateRange?: [Dayjs, Dayjs]
}

interface SampleFormValues {
  name: string
  type: string
  source: string
  submitter: string
  batchNo: string
  weight: number
  collectedAt: Dayjs
  testItems: string[]
  note?: string
}

const sampleTypes = ['玉米', '小麦', '玉米粉', '稻谷', '饲料', '大豆', '麦麸', '玉米胚芽粕']
const riskLevels: RiskLevel[] = ['安全', '低风险', '中风险', '高风险']
const sampleStatuses: SampleStatus[] = ['待登记', '待筛查', '检测中', '待判读', '待复核', '待生成报告', '已完成']
const testOptions = ['AFB₁', 'DON', 'ZEN', 'OTA', 'FB', 'T-2', 'qPCR']

export function SamplesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const samples = useAppStore((state) => state.samples)
  const addSample = useAppStore((state) => state.addSample)
  const updateSample = useAppStore((state) => state.updateSample)
  const deleteSamples = useAppStore((state) => state.deleteSamples)
  const updateSampleStatus = useAppStore((state) => state.updateSampleStatus)
  const [filterForm] = Form.useForm<FilterValues>()
  const [sampleForm] = Form.useForm<SampleFormValues>()
  const [filters, setFilters] = useState<FilterValues>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sample | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const initial: FilterValues = {
      keyword: searchParams.get('q') ?? undefined,
      riskLevel: (searchParams.get('risk') as RiskLevel | null) ?? undefined,
      status: (searchParams.get('status') as SampleStatus | null) ?? undefined,
    }
    setFilters(initial)
    filterForm.setFieldsValue(initial)
  }, [filterForm, searchParams])

  const filteredSamples = useMemo(() => samples.filter((sample) => {
    const keyword = filters.keyword?.trim().toLowerCase()
    const keywordMatch = !keyword || [sample.id, sample.name, sample.batchNo, sample.submitter].some((value) => value.toLowerCase().includes(keyword))
    const typeMatch = !filters.type || sample.type === filters.type
    const submitterMatch = !filters.submitter || sample.submitter.includes(filters.submitter)
    const riskMatch = !filters.riskLevel || sample.riskLevel === filters.riskLevel
    const statusMatch = !filters.status || sample.status === filters.status
    const dateMatch = !filters.dateRange || (dayjs(sample.collectedAt).isAfter(filters.dateRange[0].startOf('day')) && dayjs(sample.collectedAt).isBefore(filters.dateRange[1].endOf('day')))
    return keywordMatch && typeMatch && submitterMatch && riskMatch && statusMatch && dateMatch
  }), [filters, samples])

  const openCreate = () => {
    setEditing(null)
    sampleForm.resetFields()
    sampleForm.setFieldsValue({ collectedAt: dayjs(), weight: 1, testItems: ['AFB₁', 'DON', 'ZEN'] })
    setModalOpen(true)
  }

  const openEdit = (sample: Sample) => {
    setEditing(sample)
    sampleForm.setFieldsValue({ ...sample, collectedAt: dayjs(sample.collectedAt) })
    setModalOpen(true)
  }

  const saveSample = async () => {
    const values = await sampleForm.validateFields()
    if (editing) {
      updateSample({ ...editing, ...values, collectedAt: values.collectedAt.format('YYYY-MM-DD HH:mm') })
      message.success('样本信息已更新')
    } else {
      const sequence = String(samples.length + 46).padStart(4, '0')
      addSample({
        id: `S${dayjs().format('YYYYMMDD')}${sequence}`,
        name: values.name,
        type: values.type,
        source: values.source,
        submitter: values.submitter,
        batchNo: values.batchNo,
        weight: values.weight,
        collectedAt: values.collectedAt.format('YYYY-MM-DD HH:mm'),
        createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
        status: '待筛查',
        riskLevel: '安全',
        testItems: values.testItems,
        note: values.note,
      })
      message.success('样本创建成功，已进入待筛查队列')
    }
    setModalOpen(false)
  }

  const exportSamples = (rows = filteredSamples) => {
    const header = '样本编号,样本名称,样本类型,送检单位,当前状态,风险等级,采样时间\n'
    const csv = rows.map((sample) => [sample.id, sample.name, sample.type, sample.submitter, sample.status, sample.riskLevel, sample.collectedAt].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`\ufeff${header}${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `样本列表-${dayjs().format('YYYYMMDD')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${rows.length} 条样本数据`)
  }

  const importProps: UploadProps = {
    accept: '.csv', showUploadList: false,
    beforeUpload: () => {
      message.loading({ content: '正在解析仪器数据…', key: 'import' })
      window.setTimeout(() => message.success({ content: '导入完成：识别 12 条记录，其中 2 条需人工确认', key: 'import' }), 800)
      return false
    },
  }

  const columns: TableColumnsType<Sample> = [
    { title: '样本编号', dataIndex: 'id', width: 142, fixed: 'left', render: (value: string) => <Button type="link" className="table-link" onClick={() => navigate(`/analysis/${value}`)}>{value}</Button> },
    { title: '样本名称', dataIndex: 'name', width: 165, ellipsis: true },
    { title: '样本类型', dataIndex: 'type', width: 95 },
    { title: '送检单位', dataIndex: 'submitter', width: 190, ellipsis: true },
    { title: '检测项目', dataIndex: 'testItems', width: 190, render: (items: string[]) => <span className="muted-cell">{items.join('、')}</span> },
    { title: '当前状态', dataIndex: 'status', width: 110, render: (value: SampleStatus) => <StatusTag status={value} /> },
    { title: '风险等级', dataIndex: 'riskLevel', width: 100, render: (value: RiskLevel) => <RiskTag level={value} /> },
    { title: '采样时间', dataIndex: 'collectedAt', width: 150 },
    {
      title: '操作', key: 'action', width: 166, fixed: 'right',
      render: (_, sample) => (
        <Space size={2}>
          <Button type="link" onClick={() => navigate(`/analysis/${sample.id}`)}>查看</Button>
          <Button type="link" onClick={() => openEdit(sample)}>编辑</Button>
          <Dropdown menu={{ items: [
            { key: 'copy', label: '复制样本', onClick: () => { addSample({ ...sample, id: `${sample.id}-C`, name: `${sample.name}-副本` }); message.success('已复制样本') } },
            { key: 'delete', danger: true, label: '删除样本', onClick: () => { deleteSamples([sample.id]); message.success('样本已删除') } },
          ] }}><Button type="link">更多 <MoreHorizontal size={14} /></Button></Dropdown>
        </Space>
      ),
    },
  ]

  return (
    <div className="page samples-page page-enter">
      <PageHeading title="样本管理" description="覆盖样本登记、检测流转与全生命周期追溯" actions={
        <Space>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>新建样本</Button>
          <Upload {...importProps}><Button icon={<FileUp size={16} />}>批量导入</Button></Upload>
          <Button icon={<Download size={16} />} onClick={() => exportSamples()}>导出</Button>
        </Space>
      } />

      <SectionPanel className="filter-panel">
        <Form<FilterValues> form={filterForm} layout="vertical" onFinish={setFilters}>
          <div className="sample-filter-grid">
            <Form.Item name="keyword" label="样本编号 / 名称"><Input prefix={<Search size={15} />} placeholder="输入编号、名称或批次" allowClear /></Form.Item>
            <Form.Item name="type" label="样本类型"><Select options={sampleTypes.map((value) => ({ value, label: value }))} placeholder="全部类型" allowClear /></Form.Item>
            <Form.Item name="submitter" label="送检单位"><Input placeholder="输入送检单位" allowClear /></Form.Item>
            <Form.Item name="riskLevel" label="风险等级"><Select options={riskLevels.map((value) => ({ value, label: value }))} placeholder="全部等级" allowClear /></Form.Item>
            <Form.Item name="status" label="当前状态"><Select options={sampleStatuses.map((value) => ({ value, label: value }))} placeholder="全部状态" allowClear /></Form.Item>
            <Form.Item name="dateRange" label="检测日期"><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item>
            <div className="filter-actions"><Button onClick={() => { filterForm.resetFields(); setFilters({}) }}>重置</Button><Button type="primary" htmlType="submit" icon={<Search size={15} />}>查询</Button></div>
          </div>
        </Form>
      </SectionPanel>

      <div className="sample-kpi-row">
        <div><span>样本总数</span><b>{samples.length.toLocaleString()}</b><small>全量归档</small></div>
        <div><span>今日新增</span><b>128</b><small className="positive">↑ 18.5%</small></div>
        <div><span>检测中</span><b>{samples.filter((item) => item.status === '检测中').length}</b><small>当前任务</small></div>
        <div><span>待复核</span><b>{samples.filter((item) => item.status === '待复核').length}</b><small className="warning-text">需优先处理</small></div>
      </div>

      <SectionPanel className="table-panel" title={`样本列表 · ${filteredSamples.length} 条`} extra={<Button icon={<Settings2 size={15} />}>列设置</Button>}>
        <div className="batch-bar">
          <span>已选 <b>{selectedKeys.length}</b> 项</span>
          <Dropdown disabled={!selectedKeys.length} menu={{ items: sampleStatuses.map((status) => ({ key: status, label: `修改为 ${status}`, onClick: () => { updateSampleStatus(selectedKeys.map(String), status); message.success('批量状态已更新'); setSelectedKeys([]) } })) }}>
            <Button disabled={!selectedKeys.length}>批量变更状态</Button>
          </Dropdown>
          <Button disabled={!selectedKeys.length} onClick={() => exportSamples(samples.filter((sample) => selectedKeys.includes(sample.id)))}>批量导出</Button>
          <Popconfirm title="确定删除选中样本？" onConfirm={() => { deleteSamples(selectedKeys.map(String)); setSelectedKeys([]); message.success('批量删除完成') }}>
            <Button danger disabled={!selectedKeys.length} icon={<Trash2 size={15} />}>批量删除</Button>
          </Popconfirm>
        </div>
        <Table<Sample>
          rowKey="id" columns={columns} dataSource={filteredSamples} scroll={{ x: 1320 }}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          pagination={{ pageSize, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条`, onShowSizeChange: (_, size) => setPageSize(size) }}
          locale={{ emptyText: <Empty description="没有符合条件的样本" /> }}
        />
      </SectionPanel>

      <Modal title={editing ? '编辑样本' : '新建样本'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={saveSample} okText={editing ? '保存修改' : '创建样本'} width={720}>
        <Form<SampleFormValues> form={sampleForm} layout="vertical" className="modal-form-grid">
          <Form.Item name="name" label="样本名称" rules={[{ required: true, message: '请输入样本名称' }]}><Input placeholder="例如：玉米-20260714-01" /></Form.Item>
          <Form.Item name="type" label="样本类型" rules={[{ required: true }]}><Select options={sampleTypes.map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="source" label="样品来源" rules={[{ required: true }]}><Select options={['田间采样', '企业送检', '粮库抽检'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="submitter" label="送检单位" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="batchNo" label="批次编号" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="weight" label="样本重量（kg）" rules={[{ required: true }]}><InputNumber min={0.1} max={100} precision={2} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="collectedAt" label="采样时间" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="testItems" label="检测项目" rules={[{ required: true }]}><Select mode="multiple" options={testOptions.map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="note" label="备注" className="full-span"><Input.TextArea rows={3} placeholder="可填写样本状态、运输条件等信息" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
