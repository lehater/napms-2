import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import Prototype from './prototype/Prototype'
import { SimulationProvider } from './prototype/simulation'
import './index.css'
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><SimulationProvider><Routes>
  <Route path="/prototype/:section?/:objectId?" element={<Prototype />} />
  <Route path="/prototype/*" element={<Prototype />} />
  <Route path="*" element={<App />} />
</Routes></SimulationProvider></BrowserRouter></StrictMode>)
