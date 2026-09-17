import { Avatar, Badge, Button, Divider, Drawer, Input, List, Popover, Space, Typography } from 'antd'
import { Bell, ChevronDown, CircleHelp, Search, ShieldCheck, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

export function AppHeader() {
  const navigate = useNavigate()
  const samples = useAppStore((state) => state.samples)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const matches = useMemo(() => search.trim() ? samples.filter((sample) =>
    [sample.id, sample.name, sample.batchNo, sample.submitter].some((value) => value.toLowerCase().includes(search.toLowerCase())),
  ).slice(0, 5) : [], [samples, search])

  const notifications = (
    <div className="notification-popover">
      <strong>消息通知</strong>
      <Divider />
      <p><span className="notice-dot danger" />7 个高风险样本等待处理</p>
      <p><span className="notice-dot warning" />23 个检测结果等待人工复核</p>
      <p><span className="notice-dot success" />今日已生成 96 份报告</p>
    </div>
  )

  return (
    <header className="app-header">
      <div className="global-search-wrap">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onPressEnter={() => search && navigate(`/samples?q=${encodeURIComponent(search)}`)}
          prefix={<Search size={17} />}
          placeholder="搜索样本编号、批次、送检单位、毒素类型等"
          allowClear
        />
        {matches.length > 0 && (
          <div className="search-results">
            {matches.map((sample) => (
              <button key={sample.id} onClick={() => { navigate(`/analysis/${sample.id}`); setSearch('') }}>
                <span>{sample.id}</span><small>{sample.name} · {sample.submitter}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <Space size={16} className="header-tools">
        <Popover placement="bottomRight" trigger="click" content={notifications}>
          <Badge count={12} size="small"><Button type="text" shape="circle" icon={<Bell size={20} />} aria-label="消息通知" /></Badge>
        </Popover>
        <Button type="text" shape="circle" icon={<CircleHelp size={20} />} onClick={() => setHelpOpen(true)} aria-label="帮助" />
        <Divider type="vertical" />
        <Avatar size={38} className="user-avatar"><UserRound size={21} /></Avatar>
        <div className="user-meta"><strong>区域粮食检测实验室</strong></div>
        <ChevronDown size={16} />
      </Space>
      <Drawer title="平台帮助" open={helpOpen} onClose={() => setHelpOpen(false)} width={420}>
        <div className="help-intro"><ShieldCheck size={24} /><div><strong>粮安智检演示指南</strong><p>所有操作均使用本地 Mock 数据，不会上传实验室数据。</p></div></div>
        <List
          dataSource={['从“样本管理”新建或筛选样本', '进入分析详情查看 ELISA、qPCR 与六毒素综合判读', '人工复核后提交判读并生成报告', '在报告中心使用本地 AI 助手解释结果']}
          renderItem={(item, index) => <List.Item><Typography.Text type="secondary">0{index + 1}</Typography.Text>{item}</List.Item>}
        />
      </Drawer>
    </header>
  )
}
