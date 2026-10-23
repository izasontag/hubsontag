import GerenciarModelos from '../componentes/GerenciarModelos'
import PainelTarefas from '../componentes/PainelTarefas'
import { useAuth } from '../lib/auth'

export default function Tarefas() {
  const { perfil } = useAuth()
  return (
    <div className="space-y-8">
      <h1 className="font-titulo text-4xl font-semibold text-marrom">Tarefas</h1>
      <PainelTarefas />
      {perfil?.papel === 'dona' && <GerenciarModelos />}
    </div>
  )
}
