import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { mensagemDeErro, usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import { STATUS_TAREFA_ROTULO, TIPO_TAREFA_ROTULO } from '../../lib/tipos'
import type { PortalTarefa } from '../../lib/tipos'

function Resposta({ t, token, enviado, onSalvo }: { t: PortalTarefa; token: string; enviado: boolean; onSalvo: (id: string, feito: boolean, resposta: string) => void }) {
  const [feito, setFeito] = useState(t.status === 'feito')
  const [texto, setTexto] = useState(t.resposta ?? '')
  const [estado, setEstado] = useState<'' | 'salvando' | 'salvo' | string>(enviado ? 'salvo' : '')
  const alterado = feito !== (t.status === 'feito') || texto.trim() !== (t.resposta ?? '').trim()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('salvando')
    const { error } = await supabase.rpc('portal_tarefa_responder', { p_token: token, p_tarefa: t.id, p_feito: feito, p_resposta: texto })
    if (error) return setEstado(mensagemDeErro(error))
    onSalvo(t.id, feito, texto.trim())
    setEstado('salvo')
  }

  return (
    <form onSubmit={enviar} className="mt-3 w-full space-y-2 rounded-md bg-areia p-3">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="h-5 w-5" checked={feito} onChange={(e) => { setFeito(e.target.checked); setEstado('') }} />
        Já fiz este item
      </label>
      <label className="block text-sm text-texto-suave">
        Sua resposta ou comentário (opcional)
        <textarea className={`${inputCls} mt-1 min-h-20`} maxLength={2000} value={texto} onChange={(e) => { setTexto(e.target.value); setEstado('') }} />
      </label>
      <div className="flex min-h-11 items-center gap-3">
        <button className={btnPrimario} disabled={!alterado || estado === 'salvando'}>{estado === 'salvando' ? 'Enviando…' : 'Enviar'}</button>
        <span className="text-sm text-texto-suave" aria-live="polite">{estado === 'salvo' ? 'Enviado. Obrigada!' : estado && estado !== 'salvando' ? estado : ''}</span>
      </div>
    </form>
  )
}

function Item({ t, token, enviado, onSalvo }: { t: PortalTarefa; token: string; enviado: boolean; onSalvo: (id: string, feito: boolean, resposta: string) => void }) {
  const feito = t.status === 'feito'
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3">
      <div className="min-w-48 flex-1">
        <p className={feito ? 'text-texto-suave line-through' : 'text-texto'}>{t.titulo}</p>
        <p className="text-xs text-texto-suave">
          {TIPO_TAREFA_ROTULO[t.tipo]} · {t.responsavel === 'cliente' ? 'Com você' : 'Com a Sontag'}
          {t.data && ` · ${formatarData(t.data)}`}
        </p>
        {t.material && (
          <a href={t.material} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-sm text-musgo underline">
            Abrir material
          </a>
        )}
      </div>
      <span className={`rounded-sm border px-1.5 py-0.5 text-xs ${feito ? 'border-musgo bg-musgo text-superficie' : 'border-linha text-texto-suave'}`}>
        {STATUS_TAREFA_ROTULO[t.status]}
      </span>
      {t.responsavel === 'cliente' && <Resposta key={t.id} t={t} token={token} enviado={enviado} onSalvo={onSalvo} />}
    </li>
  )
}

export default function PortalPlano() {
  const { token } = usePortal()
  const [itens, setItens] = useState<PortalTarefa[] | null>(null)
  const [erro, setErro] = useState(false)
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.rpc('portal_tarefas', { p_token: token }).then(({ data, error }) => {
      if (error) setErro(true)
      else setItens((data as PortalTarefa[]) ?? [])
    })
  }, [token])

  function respondido(id: string, feito: boolean, resposta: string) {
    setEnviados((e) => new Set(e).add(id))
    setItens((atual) => (atual ?? []).map((x) => (x.id === id ? { ...x, status: feito ? 'feito' : 'fazer', resposta: resposta || null } : x)))
  }

  const abertas = (itens ?? []).filter((t) => t.status !== 'feito')
  const feitas = (itens ?? []).filter((t) => t.status === 'feito')

  return (
    <div className="space-y-6">
      <h2 className="titulo-secao">Plano de ação</h2>
      {erro && <Aviso tipo="erro">Não foi possível carregar o plano de ação.</Aviso>}
      {(itens ?? []).some((t) => t.responsavel === 'cliente' && t.status !== 'feito') && (
        <p className="text-sm text-texto-suave">Os itens marcados como "Com você" podem ser respondidos aqui mesmo: marque quando fizer e deixe um comentário se quiser.</p>
      )}
      {itens?.length === 0 && <p className="text-texto-suave">Ainda não há itens no plano de ação.</p>}
      {abertas.length > 0 && (
        <Cartao>
          <Titulo>Em andamento</Titulo>
          <ul className="divide-y divide-linha">
            {abertas.map((t) => (
              <Item key={t.id} t={t} token={token} enviado={enviados.has(t.id)} onSalvo={respondido} />
            ))}
          </ul>
        </Cartao>
      )}
      {feitas.length > 0 && (
        <Cartao>
          <Titulo>Concluídos</Titulo>
          <ul className="divide-y divide-linha">
            {feitas.map((t) => (
              <Item key={t.id} t={t} token={token} enviado={enviados.has(t.id)} onSalvo={respondido} />
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  )
}
