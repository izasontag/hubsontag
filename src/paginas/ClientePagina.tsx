import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Aviso, STATUS_ROTULO } from '../componentes/ui'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../lib/tipos'
import FichaCliente from './cliente/FichaCliente'
import CalendarioCliente from './cliente/CalendarioCliente'
import ManualMarca from './cliente/ManualMarca'

export default function ClientePagina() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [erro, setErro] = useState('')
  const abaParam = params.get('aba')
  const aba = abaParam === 'manual' || abaParam === 'calendario' ? abaParam : 'ficha'

  useEffect(() => {
    if (!id) return
    supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setErro('Cliente não encontrado.')
        else setCliente(data as Cliente)
      })
  }, [id])

  const botaoAba = (chave: 'ficha' | 'calendario' | 'manual', rotulo: string) => (
    <button
      onClick={() => setParams(chave === 'ficha' ? {} : { aba: chave })}
      aria-current={aba === chave ? 'page' : undefined}
      className={`min-h-11 cursor-pointer border-b-2 px-1 text-sm ${
        aba === chave ? 'border-marrom text-marrom' : 'border-transparent text-texto-suave hover:text-texto'
      }`}
    >
      {rotulo}
    </button>
  )

  return (
    <div className="space-y-6">
      <Link to="/app/clientes" className="inline-flex min-h-11 items-center text-sm text-texto-suave underline">
        Voltar para clientes
      </Link>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!cliente && !erro && <p className="text-texto-suave">Carregando...</p>}
      {cliente && (
        <>
          <header className="border-l-4 pl-4" style={{ borderColor: cliente.cor_destaque }}>
            <h1 className="font-titulo text-4xl font-semibold text-texto">{cliente.nome}</h1>
            <p className="text-sm text-texto-suave">
              {[cliente.instagram, cliente.nicho, STATUS_ROTULO[cliente.status]].filter(Boolean).join(' · ')}
            </p>
          </header>
          <nav className="flex gap-6 border-b border-linha" aria-label="Seções do cliente">
            {botaoAba('ficha', 'Ficha')}
            {botaoAba('calendario', 'Calendário')}
            {botaoAba('manual', 'Manual da marca')}
          </nav>
          {aba === 'ficha' && <FichaCliente cliente={cliente} onChange={setCliente} />}
          {aba === 'calendario' && <CalendarioCliente cliente={cliente} />}
          {aba === 'manual' && <ManualMarca cliente={cliente} />}
        </>
      )}
    </div>
  )
}
