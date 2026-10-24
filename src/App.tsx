import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LayoutApp from './componentes/LayoutApp'
import RotaProtegida from './componentes/RotaProtegida'
import { ProvedorAuth } from './lib/auth'
import CalendarioGeral from './paginas/CalendarioGeral'
import ClienteNovo from './paginas/ClienteNovo'
import ClientePagina from './paginas/ClientePagina'
import Clientes from './paginas/Clientes'
import Entrar from './paginas/Entrar'
import Agencia from './paginas/financeiro/Agencia'
import Financeiro from './paginas/financeiro/Financeiro'
import Pessoal from './paginas/financeiro/Pessoal'
import Equipe from './paginas/Equipe'
import EventoPagina from './paginas/EventoPagina'
import Eventos from './paginas/Eventos'
import Ideias from './paginas/Ideias'
import OrcamentoPagina from './paginas/OrcamentoPagina'
import Precificacao from './paginas/Precificacao'
import Painel from './paginas/Painel'
import Tarefas from './paginas/Tarefas'
import PortalAprovacoes from './paginas/portal/PortalAprovacoes'
import PortalCalendario from './paginas/portal/PortalCalendario'
import PortalEventoPagina from './paginas/portal/PortalEventoPagina'
import PortalFeed from './paginas/portal/PortalFeed'
import PortalInicio from './paginas/portal/PortalInicio'
import PortalLayout from './paginas/portal/PortalLayout'
import PortalPlano from './paginas/portal/PortalPlano'
import PortalManual from './paginas/portal/PortalManual'
import PortalMateriais from './paginas/portal/PortalMateriais'
import PortalRelatorios from './paginas/portal/PortalRelatorios'

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
            <Route path="ideias" element={<Ideias />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="eventos" element={<Eventos />} />
            <Route path="eventos/:id" element={<EventoPagina />} />
            <Route path="precificacao" element={<Precificacao />} />
            <Route path="precificacao/:id" element={<OrcamentoPagina />} />
            <Route path="equipe" element={<Equipe />} />
            <Route path="financeiro" element={<Financeiro />}>
              <Route index element={<Agencia />} />
              <Route path="pessoal" element={<Pessoal />} />
            </Route>
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/novo" element={<ClienteNovo />} />
            <Route path="clientes/:id" element={<ClientePagina />} />
          </Route>
          <Route path="/portal/:token" element={<PortalLayout />}>
            <Route index element={<PortalInicio />} />
            <Route path="aprovacoes" element={<PortalAprovacoes />} />
            <Route path="feed" element={<PortalFeed />} />
            <Route path="plano" element={<PortalPlano />} />
            <Route path="calendario" element={<PortalCalendario />} />
            <Route path="manual" element={<PortalManual />} />
            <Route path="materiais" element={<PortalMateriais />} />
            <Route path="relatorios" element={<PortalRelatorios />} />
          </Route>
          <Route path="/evento/:token" element={<PortalEventoPagina />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </ProvedorAuth>
    </BrowserRouter>
  )
}
