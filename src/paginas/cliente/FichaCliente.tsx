import { useAuth } from '../../lib/auth'
import { Cartao, Titulo } from '../../componentes/ui'
import type { Cliente } from '../../lib/tipos'
import Acessos from './Acessos'
import FormCliente from './FormCliente'
import Historico from './Historico'

export default function FichaCliente({
  cliente,
  onChange,
}: {
  cliente: Cliente
  onChange: (c: Cliente) => void
}) {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  return (
    <div className="space-y-6">
      <Cartao className="space-y-4">
        <Titulo>Dados básicos</Titulo>
        <FormCliente inicial={cliente} somenteLeitura={!dona} onSalvo={onChange} />
      </Cartao>
      {dona && <Acessos clienteId={cliente.id} />}
      <Historico clienteId={cliente.id} />
    </div>
  )
}
