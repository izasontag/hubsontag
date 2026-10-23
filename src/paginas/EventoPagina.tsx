import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Aviso, Esqueleto, formatarData } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { contagem } from '../lib/datas'
import { supabase } from '../lib/supabase'
import { STATUS_EVENTO_ROTULO } from '../lib/tipos'
import type { Evento } from '../lib/tipos'
import ChecklistEvento from './evento/ChecklistEvento'
import DadosEvento from './evento/DadosEvento'
import Roteiros from '../componentes/Roteiros'
import PagamentosEvento from './evento/PagamentosEvento'


export default function EventoPagina() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [params, setParams] = useSearchParams()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [erro, setErro] = useState('')
  const pedida = params.get('aba')
  const aba = pedida === 'checklist' || pedida === 'roteiros' || (pedida === 'pagamentos' && dona) ? pedida : 'dados'

  useEffect(() => {
    if (!id) return
    supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setErro('Evento não encontrado.')
        else setEvento(data as Evento)
      })
  }, [id])

  const botao = (chave: 'dados' | 'checklist' | 'roteiros' | 'pagamentos', rotulo: string) => (
    <button
      onClick={() => setParams(chave === 'dados' ? {} : { aba: chave })}
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
      <Link to="/app/eventos" className="inline-flex min-h-11 items-center text-sm text-texto-suave underline decoration-linha underline-offset-4 transition-colors hover:text-marrom">
        &larr; Voltar para eventos
      </Link>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!evento && !erro && <Esqueleto className="h-24" />}
      {evento && (
        <>
          <header className="anim-entrar space-y-2">
            <p className="eyebrow">
              Evento · {STATUS_EVENTO_ROTULO[evento.status]}
            </p>
            <h1 className="titulo-pagina">{evento.nome}</h1>
            <p className="text-texto-suave">
              {formatarData(evento.data_evento)}
              {evento.horario && ` às ${evento.horario.slice(0, 5)}`}
              {evento.local && ` · ${evento.local}`} · <strong className="font-medium text-marrom">{contagem(evento.data_evento)}</strong>
            </p>
          </header>
          <nav className="flex gap-6 overflow-x-auto border-b border-linha" aria-label="Seções do evento">
            {botao('dados', 'Dados e contrato')}
            {botao('checklist', 'Checklist')}
            {botao('roteiros', 'Roteiros')}
            {dona && botao('pagamentos', 'Pagamentos')}
          </nav>
          <div key={aba} className="anim-entrar">
            {aba === 'dados' && <DadosEvento evento={evento} onChange={setEvento} />}
            {aba === 'checklist' && <ChecklistEvento evento={evento} />}
            {aba === 'roteiros' && <Roteiros eventoId={evento.id} />}
            {aba === 'pagamentos' && dona && <PagamentosEvento evento={evento} />}
          </div>
        </>
      )}
    </div>
  )
}
