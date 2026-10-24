import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { dataDeHoje } from '../lib/datas'
import { linkValido } from '../lib/midias'
import { supabase } from '../lib/supabase'
import { STATUS_TAREFA, STATUS_TAREFA_ROTULO, TIPO_TAREFA_ROTULO, TIPOS_TAREFA } from '../lib/tipos'
import type { ClienteResumo, Modelo, Responsavel, StatusTarefa, Tarefa, TipoTarefa } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from './ui'

interface Rascunho {
  id: string | null
  titulo: string
  data: string
  tipo: TipoTarefa
  responsavel: Responsavel
  visivel_cliente: boolean
  material: string
  cliente_id: string // '' = geral
}

function LinhaTarefa({
  t,
  mostrarCliente,
  atrasada,
  onStatus,
  onEditar,
  onRemover,
}: {
  t: Tarefa
  mostrarCliente: boolean
  atrasada: boolean
  onStatus: (t: Tarefa, s: StatusTarefa) => void
  onEditar: (t: Tarefa) => void
  onRemover: (t: Tarefa) => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <select
        aria-label={`Status de ${t.titulo}`}
        className="min-h-11 rounded-sm border border-linha bg-superficie px-2 text-sm"
        value={t.status}
        onChange={(e) => onStatus(t, e.target.value as StatusTarefa)}
      >
        {STATUS_TAREFA.map((s) => (
          <option key={s} value={s}>
            {STATUS_TAREFA_ROTULO[s]}
          </option>
        ))}
      </select>
      <div className="min-w-48 flex-1">
        <p className={t.status === 'feito' ? 'text-texto-suave line-through' : 'text-texto'}>{t.titulo}</p>
        <p className="text-xs text-texto-suave">
          {mostrarCliente && `${t.cliente?.nome ?? 'Geral (agência)'} · `}
          {TIPO_TAREFA_ROTULO[t.tipo]} · {t.responsavel === 'cliente' ? 'Com o cliente' : 'Com a Sontag'}
          {t.data && ` · ${formatarData(t.data)}`}
          {atrasada && <strong className="text-marrom"> · atrasada</strong>}
          {t.visivel_cliente && ' · visível ao cliente'}
        </p>
        {t.material && (
          <a href={t.material} target="_blank" rel="noreferrer noopener" className="break-all text-xs text-musgo underline">
            Material
          </a>
        )}
        {t.resposta_cliente && (
          <p className="mt-2 whitespace-pre-wrap border-l-2 border-musgo pl-3 text-sm">
            <span className="eyebrow block">Resposta do cliente{t.respondida_em ? ` · ${new Date(t.respondida_em).toLocaleDateString('pt-BR')}` : ''}</span>
            {t.resposta_cliente}
          </p>
        )}
      </div>
      <button className={btnSecundario} onClick={() => onEditar(t)}>
        Editar
      </button>
      <button className={btnSecundario} onClick={() => onRemover(t)}>
        Remover
      </button>
    </li>
  )
}

export default function PainelTarefas({ clienteId }: { clienteId?: string }) {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const geral = clienteId === undefined
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroResp, setFiltroResp] = useState('')
  const [form, setForm] = useState<Rascunho | null>(null)
  const [modeloId, setModeloId] = useState('')
  const [base, setBase] = useState(dataDeHoje())
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const hoje = dataDeHoje()

  const carregar = useCallback(async () => {
    let consulta = supabase.from('tarefas').select('*, cliente:clientes(nome)')
    if (clienteId) consulta = consulta.eq('cliente_id', clienteId)
    const [t, c, m] = await Promise.all([
      consulta,
      geral ? supabase.from('clientes').select('id, nome, cor_destaque').neq('status', 'encerrado').order('nome') : Promise.resolve({ data: [] }),
      geral ? Promise.resolve({ data: [] }) : supabase.from('modelos_checklist').select('*').order('nome'),
    ])
    setTarefas((t.data as Tarefa[]) ?? [])
    setClientes((c.data as ClienteResumo[]) ?? [])
    setModelos((m.data as Modelo[]) ?? [])
  }, [clienteId, geral])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const novo = (): Rascunho => ({
    id: null,
    titulo: '',
    data: '',
    tipo: 'tarefa',
    responsavel: 'agencia',
    visivel_cliente: false,
    material: '',
    cliente_id: clienteId ?? (dona ? '' : (clientes[0]?.id ?? '')),
  })

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    if (form.material.trim() && !linkValido(form.material)) return setErro('O link do material precisa começar com http:// ou https://')
    const cid = form.cliente_id || null
    const campos = {
      titulo: form.titulo.trim(),
      data: form.data || null,
      tipo: form.tipo,
      responsavel: form.responsavel,
      visivel_cliente: cid ? form.visivel_cliente : false,
      material: form.material.trim() || null,
      cliente_id: cid,
    }
    const { error } = form.id
      ? await supabase.from('tarefas').update(campos).eq('id', form.id)
      : await supabase.from('tarefas').insert(campos)
    if (error) return setErro('Não foi possível salvar a tarefa.')
    setForm(null)
    void carregar()
  }

  async function mudarStatus(t: Tarefa, status: StatusTarefa) {
    setTarefas((atual) => atual.map((x) => (x.id === t.id ? { ...x, status } : x)))
    const { error } = await supabase.from('tarefas').update({ status }).eq('id', t.id)
    if (error) {
      setErro('Não foi possível mudar o status.')
      void carregar()
    }
  }

  async function remover(t: Tarefa) {
    if (!window.confirm(`Remover "${t.titulo}"?`)) return
    await supabase.from('tarefas').delete().eq('id', t.id)
    void carregar()
  }

  async function aplicarModelo() {
    if (!modeloId || !clienteId) return
    setErro('')
    setMsg('')
    const { data, error } = await supabase.rpc('aplicar_modelo', { p_modelo: modeloId, p_cliente: clienteId, p_base: base })
    if (error) return setErro('Não foi possível aplicar o modelo.')
    setMsg(`${data as number} tarefas criadas a partir do modelo.`)
    setModeloId('')
    void carregar()
  }

  const visiveis = tarefas.filter(
    (t) =>
      (!filtroCliente || (filtroCliente === 'geral' ? t.cliente_id === null : t.cliente_id === filtroCliente)) &&
      (!filtroResp || t.responsavel === filtroResp),
  )
  const porData = (a: Tarefa, b: Tarefa) => (a.data ?? '9999').localeCompare(b.data ?? '9999')
  const abertas = visiveis.filter((t) => t.status !== 'feito').sort(porData)
  const atrasadas = abertas.filter((t) => t.data && t.data < hoje)
  const emDia = abertas.filter((t) => !(t.data && t.data < hoje))
  const feitas = visiveis.filter((t) => t.status === 'feito').sort((a, b) => porData(b, a))

  const linha = (t: Tarefa) => (
    <LinhaTarefa
      key={t.id}
      t={t}
      mostrarCliente={geral}
      atrasada={t.status !== 'feito' && Boolean(t.data && t.data < hoje)}
      onStatus={(x, s) => void mudarStatus(x, s)}
      onEditar={(x) =>
        setForm({ id: x.id, titulo: x.titulo, data: x.data ?? '', tipo: x.tipo, responsavel: x.responsavel, visivel_cliente: x.visivel_cliente, material: x.material ?? '', cliente_id: x.cliente_id ?? '' })
      }
      onRemover={(x) => void remover(x)}
    />
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {geral ? (
          <div className="grid min-w-60 flex-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-texto-suave">
              Cliente
              <select className={`${inputCls} mt-1`} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                <option value="">Todos</option>
                {dona && <option value="geral">Geral (agência)</option>}
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-texto-suave">
              Quem faz
              <select className={`${inputCls} mt-1`} value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)}>
                <option value="">Todos</option>
                <option value="agencia">Sontag</option>
                <option value="cliente">Cliente</option>
              </select>
            </label>
          </div>
        ) : (
          <div />
        )}
        <button className={btnPrimario} onClick={() => setForm(novo())}>
          Nova tarefa
        </button>
      </div>

      {!geral && modelos.length > 0 && (
        <Cartao className="space-y-3">
          <h3 className="font-titulo text-xl font-semibold text-marrom">Aplicar um modelo de checklist</h3>
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
            <button className={btnSecundario} disabled={!modeloId} onClick={() => void aplicarModelo()}>
              Aplicar
            </button>
          </div>
          <p className="text-xs text-texto-suave">Cada item vira uma tarefa, com a data = data de início + os dias do modelo.</p>
        </Cartao>
      )}

      {form && (
        <form onSubmit={salvar} className="space-y-3 rounded-md border border-linha bg-superficie p-4 shadow-suave">
          <h3 className="font-titulo text-xl font-semibold text-marrom">{form.id ? 'Editar tarefa' : 'Nova tarefa'}</h3>
          <Campo rotulo="O que precisa ser feito">
            <input required className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Data">
              <input type="date" className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Campo>
            <Campo rotulo="Tipo">
              <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoTarefa })}>
                {TIPOS_TAREFA.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_TAREFA_ROTULO[t]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Quem faz">
              <select className={inputCls} value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value as Responsavel })}>
                <option value="agencia">Sontag</option>
                <option value="cliente">Cliente</option>
              </select>
            </Campo>
          </div>
          {geral && (
            <Campo rotulo="Cliente">
              <select className={inputCls} value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                {dona && <option value="">Geral (agência)</option>}
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Material (link, opcional)">
            <input className={inputCls} placeholder="https://..." value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
          </Campo>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" disabled={!form.cliente_id} checked={form.visivel_cliente && Boolean(form.cliente_id)} onChange={(e) => setForm({ ...form, visivel_cliente: e.target.checked })} />
            Mostrar no Plano de ação do portal do cliente
          </label>
          {form.visivel_cliente && form.cliente_id && form.responsavel === 'cliente' && (
            <p className="text-sm text-texto-suave">Como o item é "com o cliente", ele poderá marcar como feito e escrever uma resposta no portal. Você vê a resposta aqui.</p>
          )}
          <div className="flex gap-3">
            <button type="submit" className={btnPrimario}>
              Salvar
            </button>
            <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      {atrasadas.length > 0 && (
        <section>
          <Titulo>Atrasadas</Titulo>
          <ul className="divide-y divide-linha">{atrasadas.map(linha)}</ul>
        </section>
      )}
      <section>
        <Titulo>A fazer</Titulo>
        {emDia.length === 0 && <p className="mt-2 text-sm text-texto-suave">Nada pendente.</p>}
        <ul className="divide-y divide-linha">{emDia.map(linha)}</ul>
      </section>
      {feitas.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-titulo text-2xl font-semibold text-marrom">Feitas ({feitas.length})</summary>
          <ul className="divide-y divide-linha">{feitas.map(linha)}</ul>
        </details>
      )}
    </div>
  )
}
