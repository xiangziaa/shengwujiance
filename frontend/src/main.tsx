import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './styles.css'
import { AppRouter } from './router/AppRouter'

// Remove obsolete recording cache; settings and downloaded files are preserved.
try { localStorage.removeItem('bio-xiaoan-voice-packages-v1') } catch { /* Storage may be unavailable. */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2878FF', colorSuccess: '#16B364', colorWarning: '#F79009', colorError: '#F04438',
          colorText: '#182230', colorTextSecondary: '#667085', colorBorder: '#E4E7EC', colorBgLayout: '#F5F7FA',
          borderRadius: 10, borderRadiusLG: 12, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
          controlHeight: 36, fontSize: 14,
        },
        components: {
          Button: { fontWeight: 600 },
          Table: { headerBg: '#F8FAFC', headerColor: '#344054', rowHoverBg: '#F5F9FF', cellPaddingBlockSM: 10 },
          Menu: { itemBorderRadius: 10, itemHeight: 48, itemMarginInline: 14, itemMarginBlock: 4 },
          Segmented: { itemSelectedBg: '#FFFFFF' },
        },
      }}
    >
      <AntApp>
        <BrowserRouter><AppRouter /></BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
