import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import App from './App'
import { DemoProfile, useDemoProfile } from './DemoProfile'
import BusinessProcesses from './BusinessProcesses'
import Prototype from './prototype/Prototype'
import { SimulationProvider } from './prototype/simulation'
import './index.css'
import { Shell } from './prototype/Shell'
function Layout() {
 const profile = useDemoProfile()
 return <Shell><div key={profile.actor}><Routes>
  <Route path="/" element={<Navigate to="/business-processes" replace />} />
  <Route path="/business-processes/*" element={<BusinessProcesses />} />
  <Route path="/access-requests/*" element={<App />} />
  <Route path="/prototype/:section?/:objectId?" element={<Prototype />} />
  <Route path="*" element={<NotFound />} />
 </Routes></div></Shell>
}
function NotFound() {
 const { pathname } = useLocation()
 return <section className="ux-panel ux-panel-body"><h1>Страница не найдена</h1><Link to="/">На главную</Link><p>{pathname}</p></section>
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><SimulationProvider><DemoProfile><Layout /></DemoProfile></SimulationProvider></BrowserRouter></StrictMode>)
