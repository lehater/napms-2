import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import PolicyRule from './PolicyRule'
import { DemoProfile, useDemoProfile } from './DemoProfile'
import BusinessProcesses from './BusinessProcesses'
import NotFound from './NotFound'
import './index.css'
import { Shell } from './Shell'
const ResearchApp = lazy(() => import('./prototype/ResearchApp'))
function Layout() {
 const profile = useDemoProfile()
 return <Shell><div key={profile.actor}><Routes>
  <Route path="/" element={<Navigate to="/business-processes" replace />} />
  <Route path="/business-processes/*" element={<BusinessProcesses />} />
  <Route path="/policy-rules/:ruleId" element={<PolicyRule />} />
  <Route path="/access-requests/*" element={<App />} />
  <Route path="*" element={<NotFound />} />
 </Routes></div></Shell>
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><DemoProfile><Routes>
  <Route path="/prototype/*" element={<Suspense fallback={<p role="status">Загрузка учебного прототипа…</p>}><ResearchApp /></Suspense>} />
  <Route path="*" element={<Layout />} />
</Routes></DemoProfile></BrowserRouter></StrictMode>)
