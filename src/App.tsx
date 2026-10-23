import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LayoutApp from './componentes/LayoutApp'
import RotaProtegida from './componentes/RotaProtegida'
import { ProvedorAuth } from './lib/auth'
import CalendarioGeral from './paginas/CalendarioGeral'
import ClienteNovo from './paginas/ClienteNovo'
import ClientePagina from './paginas/ClientePagina'
import Clientes from './paginas/Clientes'
import Entrar from './paginas/Entrar'
import Painel from './paginas/Painel'

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorAuth>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route
            path="/app"
            element={
              <RotaProtegida>
                <LayoutApp />
              </RotaProtegida>
            }
          >
            <Route index element={<Painel />} />
            <Route path="calendario" element={<CalendarioGeral />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/novo" element={<ClienteNovo />} />
            <Route path="clientes/:id" element={<ClientePagina />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </ProvedorAuth>
    </BrowserRouter>
  )
}
