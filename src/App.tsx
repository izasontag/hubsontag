import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Inicio from './paginas/Inicio'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  )
}
