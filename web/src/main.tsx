import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import { DemoProfile } from './DemoProfile'
import BusinessProcesses from './BusinessProcesses'
import Prototype from './prototype/Prototype'
import { SimulationProvider } from './prototype/simulation'
import './index.css'
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><SimulationProvider><DemoProfile><Routes>
  <Route path="/business-processes/*" element={<BusinessProcesses />} />
  <Route path="/prototype/:section?/:objectId?" element={<Prototype />} />
  <Route path="/prototype/*" element={<Prototype />} />
  <Route path="*" element={<App />} />
</Routes></DemoProfile></SimulationProvider></BrowserRouter></StrictMode>)
