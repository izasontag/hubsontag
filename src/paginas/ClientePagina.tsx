import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { textoSobre } from '../componentes/animacao'
import { Aviso, Esqueleto, STATUS_ROTULO } from '../componentes/ui'
import { iniciais } from './Clientes'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../lib/tipos'
import FichaCliente from './cliente/FichaCliente'
import Relatorios from './cliente/Relatorios'
import PainelTarefas from '../componentes/PainelTarefas'
import AbaPortal from './cliente/AbaPortal'
import AprovacoesCliente from './cliente/AprovacoesCliente'
import CalendarioCliente from './cliente/CalendarioCliente'
import ManualMarca from './cliente/ManualMarca'

export default function ClientePagina() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [erro, setErro] = useState('')
  const abaParam = params.get('aba')
  const aba = abaParam === 'manual' || abaParam === 'calendario' || abaParam === 'portal' || abaParam === 'aprovacoes' || abaParam === 'plano' || abaParam === 'relatorios' ? abaParam : 'ficha'

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

  const botaoAba = (chave: 'ficha' | 'aprovacoes' | 'calendario' | 'plano' | 'manual' | 'relatorios' | 'portal', rotulo: string) => (
    <button
      onClick={() => setParams(chave === 'ficha' ? {} : { aba: chave })}
      aria-current={aba === chave ? 'page' : undefined}
      className={`relative min-h-11 shrink-0 cursor-pointer px-1 text-sm tracking-wide transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-marrom after:transition-transform after:duration-300 ${
        aba === chave ? 'text-marrom after:scale-x-100' : 'text-texto-suave after:scale-x-0 hover:text-texto hover:after:scale-x-50'
      }`}
    >
      {rotulo}
    </button>
  )

  return (
    <div className="space-y-8">
      <Link to="/app/clientes" className="inline-flex min-h-11 items-center text-sm text-texto-suave underline decoration-linha underline-offset-4 transition-colors hover:text-marrom">
        &larr; Voltar para clientes
      </Link>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!cliente && !erro && <Esqueleto className="h-24" />}
      {cliente && (
        <>
          <header className="anim-entrar flex items-center gap-5">
            <span
              aria-hidden
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-medium shadow-suave sm:h-20 sm:w-20 sm:text-2xl"
              style={{ background: cliente.cor_destaque, color: textoSobre(cliente.cor_destaque) }}
            >
              {iniciais(cliente.nome)}
            </span>
            <div className="min-w-0">
              <h1 className="titulo-pagina">{cliente.nome}</h1>
              <p className="mt-1 text-sm text-texto-suave">
                {[cliente.instagram, cliente.nicho, STATUS_ROTULO[cliente.status]].filter(Boolean).join(' · ')}
              </p>
            </div>
          </header>
          <nav className="flex gap-6 overflow-x-auto border-b border-linha" aria-label="Seções do cliente">
            {botaoAba('ficha', 'Ficha')}
            {botaoAba('aprovacoes', 'Aprovações')}
            {botaoAba('calendario', 'Calendário')}
            {botaoAba('plano', 'Plano de ação')}
            {botaoAba('manual', 'Manual da marca')}
            {botaoAba('relatorios', 'Relatórios')}
            {botaoAba('portal', 'Portal')}
          </nav>
          <div key={aba} className="anim-entrar">
            {aba === 'ficha' && <FichaCliente cliente={cliente} onChange={setCliente} />}
            {aba === 'aprovacoes' && <AprovacoesCliente cliente={cliente} />}
            {aba === 'calendario' && <CalendarioCliente cliente={cliente} />}
            {aba === 'plano' && <PainelTarefas clienteId={cliente.id} />}
            {aba === 'manual' && <ManualMarca cliente={cliente} />}
            {aba === 'relatorios' && <Relatorios cliente={cliente} />}
            {aba === 'portal' && <AbaPortal cliente={cliente} onChange={setCliente} />}
          </div>
        </>
      )}
    </div>
  )
}
