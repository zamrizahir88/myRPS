import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n'
import './index.css'

// HashRouter, not BrowserRouter: GitHub Pages serves static files and would
// 404 on a deep link like /myRPS/academic.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </HashRouter>
  </React.StrictMode>,
)
