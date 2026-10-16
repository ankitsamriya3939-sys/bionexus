import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined') {
  console.log(
    '%c BioNexus Studio %c https://bionexusstudio.ai ',
    'background: #06b6d4; color: #0b0f19; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    'background: #111827; color: #38bdf8; padding: 4px 8px; border-radius: 4px;'
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
