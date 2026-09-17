import { VoiceSettingsPage } from '../pages/VoiceSettingsPage'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AnalysisPage } from '../pages/AnalysisPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DetectionQueuePage } from '../pages/DetectionQueuePage'
import { KnowledgePage } from '../pages/KnowledgePage'
import { ReportsPage } from '../pages/ReportsPage'
import { SamplesPage } from '../pages/SamplesPage'
import { ScreeningPage } from '../pages/ScreeningPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AiScreenPage } from '../pages/AiScreenPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="voice-settings" element={<VoiceSettingsPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="samples" element={<SamplesPage />} />
        <Route path="screening" element={<ScreeningPage />} />
        <Route path="elisa" element={<DetectionQueuePage mode="ELISA" />} />
        <Route path="qpcr" element={<DetectionQueuePage mode="qPCR" />} />
        <Route path="analysis/:sampleId" element={<AnalysisPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ai-screen" element={<AiScreenPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
