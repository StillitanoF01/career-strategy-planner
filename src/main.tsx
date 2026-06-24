import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Fonts (self-hosted via @fontsource, no external request). Oswald display, Archivo body.
import '@fontsource/oswald/400.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/600.css'
import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'

// Theme tokens + global element styles
import './theme/tokens.css'
import './theme/base.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
