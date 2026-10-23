import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { TIPO_TAREFA_ROTULO, TIPOS_TAREFA } from '../lib/tipos'
import type { ItemModelo, Modelo, Responsavel, TipoTarefa } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from './ui'

interface Rascunho {
  id: string | null
  nome: string
  descricao: string
  itens: ItemModelo[]
}

const itemVazio = (): ItemModelo => ({ titulo: '', dias: 0, tipo: 'tarefa', responsavel: 'agencia', visivel_cliente: false })

// Criação e edição dos modelos de checklist (só a dona).
export default function GerenciarModelos() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [form, setForm] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('modelos_checklist').select('*').order('nome')
    setModelos((data as Modelo[]) ?? [])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const itens = form.itens.filter((i) => i.titulo.trim() !== '').map((i) => ({ ...i, titulo: i.titulo.trim() }))
    const campos = { nome: form.nome.trim(), descricao: form.descricao.trim() || null, itens }
    const { error } = form.id
      ? await supabase.from('modelos_checklist').update(campos).eq('id', form.id)
      : await supabase.from('modelos_checklist').insert(campos)
    if (error) return setErro('Não foi possível salvar o modelo.')
    setForm(null)
    void carregar()
  }

  async function remover(m: Modelo) {
    if (!window.confirm(`Apagar o modelo "${m.nome}"? As tarefas já criadas continuam.`)) return
    await supabase.from('modelos_checklist').delete().eq('id', m.id)
    void carregar()
  }

  const mudarItem = (i: number, campos: Partial<ItemModelo>) =>
    form && setForm({ ...form, itens: form.itens.map((x, k) => (k === i ? { ...x, ...campos } : x)) })

  return (
    <Cartao className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Titulo>Modelos de checklist</Titulo>
        <button className={btnPrimario} onClick={() => setForm({ id: null, nome: '', descricao: '', itens: [itemVazio()] })}>
          Novo modelo
        </button>
      </div>
      <p className="text-sm text-texto-suave">
        Listas prontas, como a sua Central de Processos. Aplique em um cliente na aba Plano de ação e cada item vira uma tarefa com data.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {form && (
        <form onSubmit={salvar} className="space-y-4 rounded-md border border-linha bg-fundo p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome do modelo">
              <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="Descrição (opcional)">
              <input className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Campo>
          </div>
          <ul className="space-y-3">
            {form.itens.map((it, i) => (
              <li key={i} className="space-y-2 rounded-sm border border-linha bg-superficie p-3">
                <Campo rotulo={`Item ${i + 1}`}>
                  <input className={inputCls} value={it.titulo} onChange={(e) => mudarItem(i, { titulo: e.target.value })} />
                </Campo>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo rotulo="Dias depois da data de início">
                    <input type="number" min={0} className={inputCls} value={it.dias ?? 0} onChange={(e) => mudarItem(i, { dias: Math.max(0, Number(e.target.value) || 0) })} />
                  </Campo>
                  <Campo rotulo="Tipo">
                    <select className={inputCls} value={it.tipo ?? 'tarefa'} onChange={(e) => mudarItem(i, { tipo: e.target.value as TipoTarefa })}>
                      {TIPOS_TAREFA.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_TAREFA_ROTULO[t]}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Quem faz">
                    <select className={inputCls} value={it.responsavel ?? 'agencia'} onChange={(e) => mudarItem(i, { responsavel: e.target.value as Responsavel })}>
                      <option value="agencia">Sontag</option>
                      <option value="cliente">Cliente</option>
                    </select>
                  </Campo>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5" checked={Boolean(it.visivel_cliente)} onChange={(e) => mudarItem(i, { visivel_cliente: e.target.checked })} />
                    Visível no portal do cliente
                  </label>
                  <button type="button" className={btnSecundario} onClick={() => setForm({ ...form, itens: form.itens.filter((_, k) => k !== i) })}>
                    Tirar item
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className={btnSecundario} onClick={() => setForm({ ...form, itens: [...form.itens, itemVazio()] })}>
            Adicionar item
          </button>
          <div className="flex gap-3">
            <button type="submit" className={btnPrimario}>
              Salvar modelo
            </button>
            <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-linha">
        {modelos.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              <span className="font-medium">{m.nome}</span>
              <span className="block text-sm text-texto-suave">
                {m.itens.length} itens{m.descricao ? ` · ${m.descricao}` : ''}
              </span>
            </span>
            <span className="flex gap-2">
              <button className={btnSecundario} onClick={() => setForm({ id: m.id, nome: m.nome, descricao: m.descricao ?? '', itens: m.itens.length ? m.itens : [itemVazio()] })}>
                Editar
              </button>
              <button className={btnSecundario} onClick={() => void remover(m)}>
                Apagar
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}
