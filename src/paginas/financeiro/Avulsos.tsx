import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje } from '../../lib/datas'
import { numero, reais } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { STATUS_AVULSO, STATUS_AVULSO_ROTULO } from '../../lib/tipos'
import type { Avulso, StatusAvulso } from '../../lib/tipos'

interface ClienteMin {
  id: string
  nome: string
}
interface Rascunho {
  id: string | null
  cliente_id: string
  nome: string
  valor: string
  status: StatusAvulso
  data: string
}

export default function Avulsos() {
  const [itens, setItens] = useState<Avulso[] | null>(null)
  const [clientes, setClientes] = useState<ClienteMin[]>([])
  const [form, setForm] = useState<Rascunho | null>(null)
  const [cobrando, setCobrando] = useState<{ id: string; vencimento: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [a, k] = await Promise.all([
      supabase.from('projetos_avulsos').select('*, cliente:clientes(nome)').order('data', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    if (a.error) return setErro('Não foi possível carregar os projetos.')
    setItens(a.data as Avulso[])
    setClientes((k.data as ClienteMin[]) ?? [])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = { cliente_id: form.cliente_id || null, nome: form.nome.trim(), valor: numero(form.valor), status: form.status, data: form.data }
    const { error } = form.id ? await supabase.from('projetos_avulsos').update(campos).eq('id', form.id) : await supabase.from('projetos_avulsos').insert(campos)
    if (error) return setErro('Não foi possível salvar o projeto.')
    setForm(null)
    void carregar()
  }

  async function mudarStatus(a: Avulso, status: StatusAvulso) {
    setItens((atual) => (atual ?? []).map((x) => (x.id === a.id ? { ...x, status } : x)))
    await supabase.from('projetos_avulsos').update({ status }).eq('id', a.id)
  }

  async function cobrar(e: FormEvent, a: Avulso) {
    e.preventDefault()
    if (!cobrando) return
    setErro('')
    const { error } = await supabase
      .from('cobrancas')
      .insert({ projeto_id: a.id, cliente_id: a.cliente_id, descricao: a.nome, vencimento: cobrando.vencimento, valor: a.valor })
    if (error) return setErro('Não foi possível criar a cobrança.')
    setCobrando(null)
    setMsg('Cobrança criada. Veja na aba Cobranças.')
  }

  async function remover(a: Avulso) {
    if (!window.confirm(`Apagar "${a.nome}" e as cobranças dele?`)) return
    await supabase.from('projetos_avulsos').delete().eq('id', a.id)
    void carregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto-suave">Trabalhos fora do contrato mensal: filmagens, ensaios, projetos pontuais.</p>
        <button className={btnPrimario} onClick={() => setForm({ id: null, cliente_id: '', nome: '', valor: '', status: 'proposta', data: dataDeHoje() })}>
          Novo projeto
        </button>
      </div>

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar projeto' : 'Novo projeto avulso'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome do projeto">
                <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </Campo>
              <Campo rotulo="Cliente">
                <select className={inputCls} value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                  <option value="">Sem cliente cadastrado</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Valor (R$)">
                <input type="number" step="0.01" min="0" required className={inputCls} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </Campo>
              <Campo rotulo="Status">
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusAvulso })}>
                  {STATUS_AVULSO.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_AVULSO_ROTULO[s]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Data">
                <input type="date" required className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
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
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {itens === null && !erro && <p className="anim-respirar text-texto-suave">Carregando...</p>}
      {itens?.length === 0 && <p className="text-texto-suave">Nenhum projeto avulso ainda.</p>}

      <ul className="space-y-3">
        {itens?.map((a) => (
          <li key={a.id} className="space-y-3 rounded-md border border-linha bg-superficie p-4 shadow-suave">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{a.nome}</p>
                <p className="text-xs text-texto-suave">
                  {a.cliente?.nome ?? 'Sem cliente'} · {formatarData(a.data)}
                </p>
              </div>
              <select aria-label={`Status de ${a.nome}`} className="min-h-11 rounded-sm border border-linha bg-superficie px-2 text-sm" value={a.status} onChange={(e) => void mudarStatus(a, e.target.value as StatusAvulso)}>
                {STATUS_AVULSO.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_AVULSO_ROTULO[s]}
                  </option>
                ))}
              </select>
              <strong className="text-lg font-medium tabular-nums">{reais(Number(a.valor))}</strong>
            </div>
            {cobrando?.id === a.id ? (
              <form onSubmit={(e) => void cobrar(e, a)} className="flex flex-wrap items-end gap-3 rounded-sm bg-fundo p-3">
                <Campo rotulo="Vencimento da cobrança">
                  <input type="date" required className={inputCls} value={cobrando.vencimento} onChange={(e) => setCobrando({ ...cobrando, vencimento: e.target.value })} />
                </Campo>
                <button type="submit" className={btnPrimario}>
                  Criar cobrança de {reais(Number(a.valor))}
                </button>
                <button type="button" className={btnSecundario} onClick={() => setCobrando(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button className={btnPrimario} onClick={() => setCobrando({ id: a.id, vencimento: dataDeHoje() })}>
                  Gerar cobrança
                </button>
                <button className={btnSecundario} onClick={() => setForm({ id: a.id, cliente_id: a.cliente_id ?? '', nome: a.nome, valor: String(a.valor), status: a.status, data: a.data })}>
                  Editar
                </button>
                <button className={btnSecundario} onClick={() => void remover(a)}>
                  Apagar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
