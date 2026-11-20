import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls } from './ui'
import { supabase } from '../lib/supabase'
import { APROVACAO_ROTEIRO_ROTULO, FORMATO_ROTEIRO_ROTULO, FORMATOS_ROTEIRO, STATUS_ROTEIRO, STATUS_ROTEIRO_ROTULO } from '../lib/tipos'
import type { FormatoRoteiro, Roteiro, StatusRoteiro } from '../lib/tipos'

const LIMITE = 50 * 1024 * 1024

interface Form {
  id: string | null
  titulo: string
  formato: FormatoRoteiro
  status: StatusRoteiro
  data_prevista: string
  texto: string
}

const vazio: Form = { id: null, titulo: '', formato: 'reels', status: 'rascunho', data_prevista: '', texto: '' }

// Aba "Roteiros": serve para um cliente (clienteId) ou para um evento (eventoId).
export default function Roteiros({ clienteId, eventoId }: { clienteId?: string; eventoId?: string }) {
  const donoId = (clienteId ?? eventoId) as string
  const coluna = clienteId ? 'cliente_id' : 'evento_id'
  const [lista, setLista] = useState<Roteiro[] | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [portal, setPortal] = useState<{ token: string; ativo: boolean } | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('roteiros').select('*').eq(coluna, donoId).order('criado_em', { ascending: false })
    if (error) return setErro('Não foi possível carregar os roteiros.')
    setLista(data as Roteiro[])
  }, [coluna, donoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // o link de aprovação é o portal do cliente (ou o portal do evento)
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from(clienteId ? 'clientes' : 'eventos').select('token_portal, portal_ativo').eq('id', donoId).maybeSingle()
      const d = data as { token_portal: string; portal_ativo: boolean } | null
      if (d) setPortal({ token: d.token_portal, ativo: d.portal_ativo })
    })()
  }, [clienteId, donoId])

  const link = portal ? (clienteId ? `${window.location.origin}/portal/${portal.token}/roteiros` : `${window.location.origin}/evento/${portal.token}`) : ''

  async function enviarAprovacao(ids: string[]) {
    setErro('')
    setMsg('')
    const validos = (lista ?? []).filter((r) => ids.includes(r.id))
    if (validos.some((r) => !r.texto?.trim())) setErro('Roteiro sem texto escrito não vai ao cliente: ele precisa ler o roteiro aqui. Escreva o texto e envie de novo.')
    const comTexto = validos.filter((r) => r.texto?.trim()).map((r) => r.id)
    if (comTexto.length === 0) return
    if (!window.confirm(`Enviar ${comTexto.length === 1 ? 'este roteiro' : `estes ${comTexto.length} roteiros`} para o cliente aprovar?`)) return
    const { error } = await supabase.rpc('enviar_roteiros', { p_ids: comTexto })
    if (error) return setErro('Não foi possível enviar. Confira se o arquivo 020_roteiros_aprovacao.sql foi rodado no Supabase.')
    setMarcados(new Set())
    setMsg(`${comTexto.length === 1 ? 'Roteiro enviado' : 'Roteiros enviados'}. Copie o link e mande para o cliente.`)
    void carregar()
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link)
      setMsg('Link copiado. É só enviar ao cliente.')
    } catch {
      setErro('Não deu para copiar sozinho.')
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form || !form.titulo.trim()) return
    setSalvando(true)
    setErro('')
    const dados = {
      titulo: form.titulo.trim(),
      formato: form.formato,
      status: form.status,
      data_prevista: form.data_prevista || null,
      texto: form.texto.trim() || null,
    }
    const { error } = form.id
      ? await supabase.from('roteiros').update(dados).eq('id', form.id)
      : await supabase.from('roteiros').insert({ ...dados, [coluna]: donoId })
    setSalvando(false)
    if (error) return setErro('Não foi possível salvar o roteiro.')
    setForm(null)
    void carregar()
  }

  async function mudarStatus(r: Roteiro, status: StatusRoteiro) {
    setLista((atual) => (atual ?? []).map((x) => (x.id === r.id ? { ...x, status } : x)))
    const { error } = await supabase.from('roteiros').update({ status }).eq('id', r.id)
    if (error) {
      setErro('Não foi possível mudar o status.')
      void carregar()
    }
  }

  async function anexar(r: Roteiro, arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    if (arquivo.size > LIMITE) return setErro('O arquivo passa de 50 MB.')
    const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const caminho = `${donoId}/${crypto.randomUUID()}.${extensao}`
    const envio = await supabase.storage.from('roteiros').upload(caminho, arquivo, { contentType: arquivo.type || undefined })
    if (envio.error) return setErro('Não foi possível enviar o arquivo.')
    const { error } = await supabase.from('roteiros').update({ arquivo_storage: caminho, arquivo_nome: arquivo.name }).eq('id', r.id)
    if (error) {
      await supabase.storage.from('roteiros').remove([caminho])
      return setErro('Não foi possível anexar o arquivo.')
    }
    if (r.arquivo_storage) await supabase.storage.from('roteiros').remove([r.arquivo_storage])
    void carregar()
  }

  async function abrirArquivo(r: Roteiro) {
    if (!r.arquivo_storage) return
    const { data, error } = await supabase.storage.from('roteiros').createSignedUrl(r.arquivo_storage, 300)
    if (error || !data) return setErro('Não foi possível abrir o arquivo.')
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function apagar(r: Roteiro) {
    if (!window.confirm(`Apagar o roteiro "${r.titulo}"?`)) return
    if (r.arquivo_storage) await supabase.storage.from('roteiros').remove([r.arquivo_storage])
    const { error } = await supabase.from('roteiros').delete().eq('id', r.id)
    if (error) return setErro('Não foi possível apagar o roteiro.')
    void carregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-texto-suave">Escreva o roteiro aqui ou anexe o arquivo (documento, PDF, áudio, até 50 MB). Só você e a equipe atribuída veem.</p>
        <button className={btnPrimario} onClick={() => setForm({ ...vazio })}>
          Novo roteiro
        </button>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {portal && !portal.ativo && <Aviso tipo="erro">O portal está desativado: o cliente não consegue abrir o link.</Aviso>}
      {(lista ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnSecundario} disabled={marcados.size === 0} onClick={() => void enviarAprovacao([...marcados])}>Enviar selecionados para aprovação ({marcados.size})</button>
          {(lista ?? []).some((r) => r.aprovacao !== 'nao_enviado') && <button className={btnSecundario} onClick={() => void copiarLink()}>Copiar link de aprovação</button>}
        </div>
      )}

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Campo rotulo="Título">
              <input className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required autoFocus />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Formato">
                <select className={inputCls} value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value as FormatoRoteiro })}>
                  {FORMATOS_ROTEIRO.map((f) => (
                    <option key={f} value={f}>{FORMATO_ROTEIRO_ROTULO[f]}</option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Status">
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusRoteiro })}>
                  {STATUS_ROTEIRO.map((s) => (
                    <option key={s} value={s}>{STATUS_ROTEIRO_ROTULO[s]}</option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Data prevista (opcional)">
                <input type="date" className={inputCls} value={form.data_prevista} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} />
              </Campo>
            </div>
            <Campo rotulo="Roteiro">
              <textarea className={`${inputCls} min-h-48`} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
            </Campo>
            <div className="flex gap-3">
              <button className={btnPrimario} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Cartao>
      )}

      {lista && lista.length === 0 && !form && <p className="text-texto-suave">Nenhum roteiro ainda. Clique em "Novo roteiro".</p>}
      <div className="space-y-4">
        {(lista ?? []).map((r) => (
          <Cartao key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <label className="mb-1 flex min-h-8 cursor-pointer items-center gap-2 text-xs text-texto-suave">
                  <input type="checkbox" className="h-4 w-4" checked={marcados.has(r.id)} onChange={(e) => setMarcados((m) => { const n = new Set(m); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n })} aria-label={`Selecionar ${r.titulo} para enviar`} />
                  Selecionar para enviar
                </label>
                <p className="eyebrow">
                  {FORMATO_ROTEIRO_ROTULO[r.formato]}
                  {r.data_prevista && ` · ${formatarData(r.data_prevista)}`}
                </p>
                <h3 className="titulo-sub mt-1">{r.titulo}</h3>
              </div>
              <select
                aria-label={`Status do roteiro ${r.titulo}`}
                className={`${inputCls} !w-auto`}
                value={r.status}
                onChange={(e) => void mudarStatus(r, e.target.value as StatusRoteiro)}
              >
                {STATUS_ROTEIRO.map((s) => (
                  <option key={s} value={s}>{STATUS_ROTEIRO_ROTULO[s]}</option>
                ))}
              </select>
            </div>
            <div className="mt-2 space-y-1">
              <span className={`inline-block rounded-full border px-3 py-0.5 text-xs ${r.aprovacao === 'aprovado' ? 'border-musgo bg-musgo-claro text-musgo' : r.aprovacao === 'ajuste_pedido' ? 'border-red-800 bg-red-50 text-red-800' : r.aprovacao === 'enviado' ? 'border-mostarda bg-mostarda/60 text-marrom-escuro' : 'border-linha bg-areia text-texto-suave'}`}>{APROVACAO_ROTEIRO_ROTULO[r.aprovacao]}</span>
              {r.mensagem_cliente && <p className="whitespace-pre-wrap border-l-2 border-marrom pl-3 text-sm">Recado do cliente: {r.mensagem_cliente}</p>}
              {r.decidido_em && <p className="text-xs text-texto-suave">Respondido em {new Date(r.decidido_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{r.rodada > 1 ? ` (envio ${r.rodada})` : ''}</p>}
            </div>
            {r.texto && (
              <div className="mt-3">
                <p className={`whitespace-pre-wrap text-sm leading-relaxed text-texto ${aberto === r.id ? '' : 'line-clamp-4'}`}>{r.texto}</p>
                {r.texto.length > 220 && (
                  <button className="mt-1 min-h-11 cursor-pointer text-sm text-marrom underline" onClick={() => setAberto(aberto === r.id ? null : r.id)}>
                    {aberto === r.id ? 'Mostrar menos' : 'Ler tudo'}
                  </button>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {r.arquivo_storage && (
                <button className={btnSecundario} onClick={() => void abrirArquivo(r)}>
                  Abrir {r.arquivo_nome ?? 'arquivo'}
                </button>
              )}
              <label className={`${btnSecundario} cursor-pointer`}>
                {r.arquivo_storage ? 'Trocar arquivo' : 'Anexar arquivo'}
                <input type="file" className="sr-only" onChange={(e) => { void anexar(r, e.target.files?.[0]); e.target.value = '' }} />
              </label>
              <button className={btnPrimario} onClick={() => void enviarAprovacao([r.id])}>
                {r.aprovacao === 'nao_enviado' ? 'Enviar para aprovação' : 'Reenviar para aprovação'}
              </button>
              <button
                className={btnSecundario}
                onClick={() => setForm({ id: r.id, titulo: r.titulo, formato: r.formato, status: r.status, data_prevista: r.data_prevista ?? '', texto: r.texto ?? '' })}
              >
                Editar
              </button>
              <button className={`${btnSecundario} !text-red-800`} onClick={() => void apagar(r)}>Apagar</button>
            </div>
          </Cartao>
        ))}
      </div>
    </div>
  )
}
