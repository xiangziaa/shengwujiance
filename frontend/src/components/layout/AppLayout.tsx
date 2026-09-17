import { Outlet, useLocation } from 'react-router-dom'
import { DigitalHumanAssistant } from '../digital-human/DigitalHumanAssistant'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export function AppLayout() {
  const { pathname } = useLocation()
  const isAiScreen = pathname === '/ai-screen'
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className={`app-workspace ${isAiScreen ? 'ai-screen-workspace' : ''}`}>
        {!isAiScreen && <AppHeader />}
        <main className={`app-main ${isAiScreen ? 'ai-screen-main' : ''}`}><Outlet /></main>
        {!isAiScreen && <footer className="app-footer">
          <span>© 2026 粮安智检演示平台</span>
          <span>技术支持：400-888-1661</span>
          <span>数据安全已保护</span>
        </footer>}
      </div>
      {!isAiScreen && pathname !== '/voice-settings' && <DigitalHumanAssistant />}
    </div>
  )
}
