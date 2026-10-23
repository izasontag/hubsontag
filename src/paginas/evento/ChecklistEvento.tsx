import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import type { Evento, ItemEvento, Modelo } from '../../lib/tipos'

const somarDias = (data: string, dias: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const n = new Date(a, m - 1, d + dias)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function ChecklistEvento({ evento }: { evento: Evento }) {
  const [itens, setItens] = useState<ItemEvento[] | null>(null)
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [form, setForm] = useState<{ id: string | null; titulo: string; prazo: string } | null>(null)
  const [modeloId, setModeloId] = useState('')
  const [base, setBase] = useState(dataDeHoje())
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const hoje = dataDeHoje()

  const carregar = useCallback(async () => {
    const [i, m] = await Promise.all([
      supabase.from('evento_checklist').select('*').eq('evento_id', evento.id).order('ordem'),
      supabase.from('modelos_checklist').select('*').order('nome'),
    ])
    if (i.error) return setErro('Não foi possível carregar o checklist.')
    setItens(i.data as ItemEvento[])
    setModelos((m.data as Modelo[]) ?? [])
  }, [evento.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function marcar(i: ItemEvento) {
    setItens((atual) => (atual ?? []).map((x) => (x.id === i.id ? { ...x, concluido: !x.concluido } : x)))
    const { error } = await supabase.from('evento_checklist').update({ concluido: !i.concluido }).eq('id', i.id)
    if (error) {
      setErro('Não foi possível atualizar o item.')
      void carregar()
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const proxima = (itens ?? []).reduce((m, x) => Math.max(m, x.ordem), 0) + 1
    const campos = { titulo: form.titulo.trim(), prazo: form.prazo || null }
    const { error } = form.id
      ? await supabase.from('evento_checklist').update(campos).eq('id', form.id)
      : await supabase.from('evento_checklist').insert({ ...campos, evento_id: evento.id, ordem: proxima })
    if (error) return setErro('Não foi possível salvar o item.')
    setForm(null)
    void carregar()
  }

  async function remover(i: ItemEvento) {
    if (!window.confirm(`Remover "${i.titulo}"?`)) return
    await supabase.from('evento_checklist').delete().eq('id', i.id)
    void carregar()
  }

  async function aplicar() {
    const modelo = modelos.find((m) => m.id === modeloId)
    if (!modelo) return
    setErro('')
    setMsg('')
    let ordem = (itens ?? []).reduce((m, x) => Math.max(m, x.ordem), 0)
    const linhas = modelo.itens
      .filter((i) => i.titulo?.trim())
      .map((i) => ({ evento_id: evento.id, titulo: i.titulo.trim(), prazo: somarDias(base, i.dias ?? 0), ordem: ++ordem }))
    const { error } = await supabase.from('evento_checklist').insert(linhas)
    if (error) return setErro('Não foi possível aplicar o modelo.')
    setMsg(`${linhas.length} itens adicionados.`)
    setModeloId('')
    void carregar()
  }

  const lista = itens ?? []
  const feitos = lista.filter((i) => i.concluido).length
  const pct = lista.length > 0 ? Math.round((feitos / lista.length) * 100) : 0

  return (
    <div className="space-y-6">
      <Cartao className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Titulo>Checklist</Titulo>
          <p className="text-sm text-texto-suave">
            {feitos} de {lista.length} concluídos
          </p>
        </div>
        <div className="h-2 rounded-sm bg-areia" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Checklist: ${pct}%`}>
          <div className="anim-crescer h-2 rounded-sm bg-musgo" style={{ width: `${pct}%` }} />
        </div>
      </Cartao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      <ul className="divide-y divide-linha rounded-md border border-linha bg-superficie shadow-suave">
        {lista.map((i) => {
          const atrasado = !i.concluido && i.prazo !== null && i.prazo < hoje
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 p-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={i.concluido}
                aria-label={`${i.titulo}: ${i.concluido ? 'concluído' : 'pendente'}`}
                onClick={() => void marcar(i)}
                className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition duration-200 active:scale-95 ${i.concluido ? 'border-musgo bg-musgo text-superficie' : 'border-linha bg-superficie hover:border-marrom'}`}
              >
                {i.concluido && (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path className="anim-desenhar" d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
              <div className="min-w-48 flex-1">
                <p className={i.concluido ? 'text-texto-suave line-through' : ''}>{i.titulo}</p>
                {i.prazo && (
                  <p className="text-xs text-texto-suave">
                    Prazo {formatarData(i.prazo)}
                    {atrasado && <strong className="font-medium text-marrom"> · atrasado</strong>}
                  </p>
                )}
              </div>
              <button className={btnSecundario} onClick={() => setForm({ id: i.id, titulo: i.titulo, prazo: i.prazo ?? '' })}>
                Editar
              </button>
              <button className={btnSecundario} onClick={() => void remover(i)}>
                Remover
              </button>
            </li>
          )
        })}
      </ul>

      {form ? (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar item' : 'Novo item'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <Campo rotulo="O que precisa ser feito">
                <input required className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </Campo>
              <Campo rotulo="Prazo">
                <input type="date" className={inputCls} value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
              </Campo>
            </div>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Salvar
              </button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Cartao>
      ) : (
        <button className={btnPrimario} onClick={() => setForm({ id: null, titulo: '', prazo: '' })}>
          Adicionar item
        </button>
      )}

      {modelos.length > 0 && (
        <Cartao className="space-y-3">
          <h3 className="titulo-sub">Acrescentar itens de um modelo</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-48 flex-1 text-sm text-texto-suave">
              Modelo
              <select className={`${inputCls} mt-1`} value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
                <option value="">Escolha...</option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.itens.length} itens)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-texto-suave">
              Data de início
              <input type="date" className={`${inputCls} mt-1`} value={base} onChange={(e) => setBase(e.target.value)} />
            </label>
            <button className={btnSecundario} disabled={!modeloId} onClick={() => void aplicar()}>
              Acrescentar
            </button>
          </div>
        </Cartao>
      )}
    </div>
  )
}
