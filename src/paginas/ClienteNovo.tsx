import { Link, useNavigate } from 'react-router-dom'
import { CabecalhoPagina, Cartao } from '../componentes/ui'
import FormCliente from './cliente/FormCliente'

export default function ClienteNovo() {
  const navegar = useNavigate()
  return (
    <div className="space-y-6">
      <Link to="/app/clientes" className="inline-flex min-h-11 items-center text-sm text-texto-suave underline">
        Voltar para clientes
      </Link>
      <CabecalhoPagina rotulo="Cadastro" titulo={<>Novo <em>cliente</em></>} />
      <Cartao>
        <FormCliente onSalvo={(c) => navegar(`/app/clientes/${c.id}`)} />
      </Cartao>
    </div>
  )
}
