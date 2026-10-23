import GerenciarModelos from '../componentes/GerenciarModelos'
import PainelTarefas from '../componentes/PainelTarefas'
import { CabecalhoPagina } from '../componentes/ui'
import { useAuth } from '../lib/auth'

export default function Tarefas() {
  const { perfil } = useAuth()
  return (
    <div className="space-y-8">
      <CabecalhoPagina rotulo="Plano de trabalho" titulo="Tarefas" />
      <PainelTarefas />
      {perfil?.papel === 'dona' && <GerenciarModelos />}
    </div>
  )
}
