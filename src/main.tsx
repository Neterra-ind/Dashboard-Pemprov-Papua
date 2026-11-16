import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { RoleProvider } from './lib/role.tsx'
import { DisposisiProvider } from './lib/store.tsx'

// Hosted single-file exports (e.g. Artifacts) have no server to rewrite deep links,
// so they use hash-based routing; the normal dev/build app keeps BrowserRouter.
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter
const basename = import.meta.env.VITE_HASH_ROUTER === 'true' ? undefined : import.meta.env.BASE_URL

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router basename={basename}>
      <RoleProvider>
        <DisposisiProvider>
          <App />
        </DisposisiProvider>
      </RoleProvider>
    </Router>
  </StrictMode>,
)
