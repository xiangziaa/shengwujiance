import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import {
  BarChart3, BookOpen, Bot, ClipboardCheck, FileText, FlaskConical,
  Gauge, MonitorUp, Microscope, ScanSearch, Settings, Wheat,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { useAppStore } from '../../store/useAppStore'

const items: MenuProps['items'] = [
  { key: '/dashboard', icon: <Gauge size={18} />, label: '工作台' },
  { key: '/samples', icon: <ClipboardCheck size={18} />, label: '样本管理' },
  { key: '/screening', icon: <ScanSearch size={18} />, label: '快速筛查' },
  { key: '/elisa', icon: <FlaskConical size={18} />, label: 'ELISA 分析' },
  { key: '/qpcr', icon: <Microscope size={18} />, label: 'qPCR 分析' },
  { key: '/analysis', icon: <Bot size={18} />, label: 'AI 综合判读' },
  { key: '/ai-screen', icon: <MonitorUp size={18} />, label: 'AI 大屏' },
  { key: '/reports', icon: <FileText size={18} />, label: '报告中心' },
  { key: '/knowledge', icon: <BookOpen size={18} />, label: '知识库' },
  { key: '/settings', icon: <Settings size={18} />, label: '系统设置' },
]

function resolveSelected(pathname: string) {
  if (pathname.startsWith('/analysis')) return '/analysis'
  return items?.find((item) => item && 'key' in item && String(item.key) !== '/' && pathname.startsWith(String(item.key)))?.key as string ?? '/dashboard'
}

export function AppSidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const firstSampleId = useAppStore(state => state.samples[0]?.id)
  return (
    <aside className="app-sidebar">
      <BrandLogo />
      <Menu
        mode="inline"
        items={items}
        selectedKeys={[resolveSelected(pathname)]}
        onClick={({ key }) => navigate(key === '/analysis' ? firstSampleId ? `/analysis/${firstSampleId}` : '/samples' : key)}
      />
      <div className="sidebar-visual" aria-hidden="true">
        <BarChart3 className="visual-chart" size={42} />
        <Wheat className="visual-wheat wheat-one" size={96} />
        <Wheat className="visual-wheat wheat-two" size={72} />
      </div>
      <div className="sidebar-foot"><span>v2.0.0</span><span className="secure-dot" /> 本地演示数据</div>
    </aside>
  )
}
