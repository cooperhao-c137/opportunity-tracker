import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { TRPCProvider } from './providers/trpc'
import { Toaster } from '@/components/ui/sonner'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <App />
        <Toaster theme="dark" position="top-center" richColors />
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
