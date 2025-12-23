import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TldrawApp from './TldrawApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TldrawApp />
  </StrictMode>,
)
