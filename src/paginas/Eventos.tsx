import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso, btnPrimario, btnSecundario, CabecalhoPagina, Campo, Cartao, Esqueleto, formatarData, inputCls, Titulo } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { contagem, dataDeHoje, diasAte } from '../lib/datas'
import { supabase } from '../lib/supabase'
import { STATUS_EVENTO_ROTULO } from '../lib/tipos'
import type { Evento } from '../lib/tipos'

type EventoComChecklist = Evento & { evento_checklist: { concluido: boolean }[] }

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function CartaoEvento({ e, destaque, indice }: { e: EventoComChecklist; destaque?: boolean; indice: number }) {
  const [ano, mes, dia] = e.data_evento.split('-')
  const lista = e.evento_checklist ?? []
  const total = lista.length
  const feitos = lista.filter((i) => i.concluido).length
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
  const passado = diasAte(e.data_evento) < 0
  return (
    <li className="anim-entrar" style={{ '--i': indice } as CSSProperties}>
      <Link
        to={`/app/eventos/${e.id}`}
        className={`group flex h-full gap-5 rounded-md border bg-superficie p-5 shadow-suave transition duration-300 hover:-translate-y-1 hover:border-marrom hover:shadow-elevada ${destaque ? 'border-marrom bg-marrom-claro' : 'border-linha'} ${passado ? 'opacity-80' : ''}`}
      >
        <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-sm border border-linha bg-superficie py-2 text-center">
          <span className="numeros-grandes text-2xl font-medium leading-none">{dia}</span>
          <span className="eyebrow mt-1 !tracking-[0.12em]">{MESES[Number(mes) - 1]}</span>
          <span className="text-[10px] text-texto-suave">{ano}</span>
        </span>
        <span className="min-w-0 flex-1 space-y-2">
          <span className="block font-titulo text-2xl font-semibold leading-tight">{e.nome}</span>
          <span className="block text-sm text-texto-suave">
            {e.tipo === 'casamento' ? 'Casamento' : 'Evento'}
            {e.local && ` · ${e.local}`} · {contagem(e.data_evento)}
          </span>
          <span className="flex items-center gap-3 text-xs text-texto-suave">
            <span className="h-1.5 flex-1 rounded-sm bg-areia" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Checklist de ${e.nome}: ${feitos} de ${total}`}>
              <span className="anim-crescer block h-1.5 rounded-sm bg-musgo" style={{ width: `${pct}%` }} />
            </span>
            <span>
              {feitos} de {total}
            </span>
          </span>
          <span className="inline-block rounded-sm border border-linha px-1.5 py-0.5 text-xs text-texto-suave">{STATUS_EVENTO_ROTULO[e.status]}</span>
        </span>
      </Link>
    </li>
  )
}

export default function Eventos() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const dona = perfil?.papel === 'dona'
  const [eventos, setEventos] = useState<EventoComChecklist[] | null>(null)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState<{ nome: string; tipo: 'casamento' | 'evento'; data: string; horario: string; local: string; contato: string } | null>(null)

  useEffect(() => {
    supabase
      .from('eventos')
      .select('*, evento_checklist(concluido)')
      .order('data_evento')
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar os eventos.')
        else setEventos(data as EventoComChecklist[])
      })
  }, [])

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const { data, error } = await supabase
      .from('eventos')
      .insert({
        nome: form.nome.trim(),
        tipo: form.tipo,
        data_evento: form.data,
        horario: form.horario || null,
        local: form.local.trim() || null,
        contato: form.contato.trim() || null,
      })
      .select('id')
      .single()
    if (error || !data) return setErro('Não foi possível criar o evento.')
    navegar(`/app/eventos/${data.id as string}`)
  }

  const hoje = dataDeHoje()
  const proximos = (eventos ?? []).filter((e) => e.data_evento >= hoje && e.status !== 'cancelado')
  const passados = (eventos ?? []).filter((e) => e.data_evento < hoje || e.status === 'cancelado').reverse()

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        rotulo="Casamentos e eventos"
        titulo="Eventos"
        acoes={
          dona ? (
            <button className={btnPrimario} onClick={() => setForm({ nome: '', tipo: 'casamento', data: hoje, horario: '', local: '', contato: '' })}>
              Novo evento
            </button>
          ) : undefined
        }
      />
      {form && (
        <Cartao>
          <form onSubmit={criar} className="space-y-4">
            <Titulo>Novo evento</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome (casal ou cliente)">
                <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </Campo>
              <Campo rotulo="Tipo">
                <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'casamento' | 'evento' })}>
                  <option value="casamento">Casamento</option>
                  <option value="evento">Evento</option>
                </select>
              </Campo>
              <Campo rotulo="Data do evento">
                <input type="date" required className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </Campo>
              <Campo rotulo="Horário">
                <input type="time" className={inputCls} value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
              </Campo>
              <Campo rotulo="Local">
                <input className={inputCls} value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
              </Campo>
              <Campo rotulo="Contato">
                <input className={inputCls} value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
              </Campo>
            </div>
            <p className="text-xs text-texto-suave">O checklist padrão (contrato, alinhamento, cobertura, entregas...) já nasce junto, com prazos a partir da data do evento.</p>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Criar evento
              </button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Cartao>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {eventos === null && !erro && (
        <div className="grid gap-5 md:grid-cols-2">
          <Esqueleto className="h-40" />
          <Esqueleto className="h-40" />
        </div>
      )}
      {eventos && proximos.length === 0 && <p className="text-texto-suave">Nenhum evento marcado para os próximos dias.</p>}
      <ul className="grid gap-5 md:grid-cols-2">
        {proximos.map((e, i) => (
          <CartaoEvento key={e.id} e={e} indice={i} destaque={i === 0} />
        ))}
      </ul>
      {passados.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-titulo text-2xl font-semibold text-marrom">Realizados e cancelados ({passados.length})</summary>
          <ul className="mt-3 grid gap-5 md:grid-cols-2">
            {passados.map((e, i) => (
              <CartaoEvento key={e.id} e={e} indice={i} />
            ))}
          </ul>
          <p className="mt-3 text-xs text-texto-suave">Último evento em {formatarData(passados[0].data_evento)}.</p>
        </details>
      )}
    </div>
  )
}
