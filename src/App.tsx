import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Esqueleto } from './componentes/ui'
import { Pagina } from './lib/paginas'
import LayoutApp from './componentes/LayoutApp'
import RotaProtegida from './componentes/RotaProtegida'
import { ProvedorAuth } from './lib/auth'
import Entrar from './paginas/Entrar'

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorAuth>
        <Suspense fallback={<div className="mx-auto max-w-2xl space-y-4 p-6"><Esqueleto className="h-24" /><Esqueleto className="h-48" /></div>}>
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
            <Route index element={<Pagina.painel />} />
            <Route path="calendario" element={<Pagina.calendario />} />
            <Route path="ideias" element={<Pagina.ideias />} />
            <Route path="tarefas" element={<Pagina.tarefas />} />
            <Route path="eventos" element={<Pagina.eventos />} />
            <Route path="eventos/:id" element={<Pagina.evento />} />
            <Route path="precificacao" element={<Pagina.precificacao />} />
            <Route path="precificacao/:id" element={<Pagina.orcamento />} />
            <Route path="equipe" element={<Pagina.equipe />} />
            <Route path="financeiro" element={<Pagina.financeiro />}>
              <Route index element={<Pagina.agencia />} />
              <Route path="pessoal" element={<Pagina.pessoal />} />
            </Route>
            <Route path="clientes" element={<Pagina.clientes />} />
            <Route path="clientes/novo" element={<Pagina.clienteNovo />} />
            <Route path="clientes/:id" element={<Pagina.cliente />} />
          </Route>
          <Route path="/portal/:token" element={<Pagina.portalLayout />}>
            <Route index element={<Pagina.portalInicio />} />
            <Route path="estrategia" element={<Pagina.portalEstrategia />} />
            <Route path="kickoff" element={<Pagina.portalKickoff />} />
            <Route path="aprovacoes" element={<Pagina.portalAprovacoes />} />
            <Route path="feed" element={<Pagina.portalFeed />} />
            <Route path="plano" element={<Pagina.portalPlano />} />
            <Route path="calendario" element={<Pagina.portalCalendario />} />
            <Route path="manual" element={<Pagina.portalManual />} />
            <Route path="materiais" element={<Pagina.portalMateriais />} />
            <Route path="relatorios" element={<Pagina.portalRelatorios />} />
          </Route>
          <Route path="/evento/:token" element={<Pagina.portalEvento />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
        </Suspense>
      </ProvedorAuth>
    </BrowserRouter>
  )
}
