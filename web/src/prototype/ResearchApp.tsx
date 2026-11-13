import { Route, Routes } from 'react-router-dom'
import { SimulationProvider } from './simulation'
import { Shell } from './Shell'
import Prototype from './Prototype'
import NotFound from '../NotFound'
export default function ResearchApp() {
  return <SimulationProvider><Shell><Routes><Route path=":section?/:objectId?" element={<Prototype />} /><Route path="*" element={<NotFound />} /></Routes></Shell></SimulationProvider>
}
