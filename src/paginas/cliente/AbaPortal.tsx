import { useAuth } from '../../lib/auth'
import type { Cliente } from '../../lib/tipos'
import FeedAtual from './FeedAtual'
import LinkPortal from './LinkPortal'
import Materiais from './Materiais'

export default function AbaPortal({ cliente, onChange }: { cliente: Cliente; onChange: (c: Cliente) => void }) {
  const { perfil } = useAuth()
  return (
    <div className="space-y-6">
      {perfil?.papel === 'dona' && <LinkPortal cliente={cliente} onChange={onChange} />}
      <FeedAtual clienteId={cliente.id} />
      <Materiais clienteId={cliente.id} />
    </div>
  )
}
