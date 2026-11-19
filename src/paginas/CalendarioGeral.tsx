import { useEffect, useState } from 'react'
import CalendarioMensal, { NavegacaoMes } from '../componentes/CalendarioMensal'
import CartaoPost from '../componentes/CartaoPost'
import PostEditor from '../componentes/PostEditor'
import { Aviso, btnPrimario, btnSecundario, CabecalhoPagina, formatarData, inputCls } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { limitesDoMes, mesDeHoje } from '../lib/datas'
import { supabase } from '../lib/supabase'
import { STATUS_POST, STATUS_POST_ROTULO } from '../lib/tipos'
import type { Evento, PostCompleto, StatusPost } from '../lib/tipos'
import { useCalendario } from '../lib/useCalendario'

interface Editor {
  post: PostCompleto | null
  data?: string
}

export default function CalendarioGeral() {
  const { perfil } = useAuth()
  const [mes, setMes] = useState(mesDeHoje())
  const [visao, setVisao] = useState<'mes' | 'quadro'>('mes')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTag, setFiltroTag] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusPost | ''>('')
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [mostrarEventos, setMostrarEventos] = useState(true)
  const { posts, tags, clientes, carregando, erro, recarregar } = useCalendario(mes)

  // clientes de eventos aparecem no dia do evento
  useEffect(() => {
    const { inicio, fim } = limitesDoMes(mes)
    supabase
      .from('eventos')
      .select('*')
      .gte('data_evento', inicio)
      .lte('data_evento', fim)
      .neq('status', 'cancelado')
      .order('data_evento')
      .then(({ data }) => setEventos((data as Evento[]) ?? []))
  }, [mes])

  const tagsFiltro = tags.filter((t) => !filtroCliente || t.cliente_id === null || t.cliente_id === filtroCliente)
  const termo = busca.trim().toLowerCase()
  const base = posts.filter(
    (p) =>
      (!filtroCliente || p.cliente_id === filtroCliente) &&
      (!filtroTag || p.post_tags.some((t) => t.tag_id === filtroTag)) &&
      (!termo || `${p.tema ?? ''} ${p.gancho ?? ''} ${p.legenda ?? ''} ${p.cliente?.nome ?? ''}`.toLowerCase().includes(termo)),
  )
  const filtrados = base.filter((p) => !filtroStatus || p.status === filtroStatus)
  const contagem = (s: StatusPost) => base.filter((p) => p.status === s).length

  // reagendar arrastando o post para outro dia (computador)
  async function mover(id: string, data: string) {
    const alvo = posts.find((p) => p.id === id)
    if (!alvo || alvo.data_publicacao === data) return
    setAviso(null)
    const { error } = await supabase.from('posts').update({ data_publicacao: data }).eq('id', id)
    if (error) return setAviso({ tipo: 'erro', texto: 'Não foi possível mudar a data do post.' })
    setAviso({ tipo: 'ok', texto: `"${alvo.tema || 'Post'}" agora está em ${formatarData(data)}.` })
    recarregar()
  }

  async function mudarStatus(p: PostCompleto, status: StatusPost) {
    setAviso(null)
    const { error } = await supabase.from('posts').update({ status }).eq('id', p.id)
    if (error) return setAviso({ tipo: 'erro', texto: 'Não foi possível mudar o status.' })
    recarregar()
  }
  const abrir = (post: PostCompleto) => setEditor({ post })

  const botaoVisao = (chave: 'mes' | 'quadro', rotulo: string) => (
    <button
      type="button"
      aria-pressed={visao === chave}
      onClick={() => setVisao(chave)}
      className={`min-h-11 cursor-pointer rounded-sm border px-4 text-sm ${
        visao === chave ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave'
      }`}
    >
      {rotulo}
    </button>
  )

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        rotulo="Todos os clientes"
        titulo={<>Calendário <em>geral</em></>}
        acoes={
          <button className={btnPrimario} onClick={() => setEditor({ post: null })} disabled={clientes.length === 0}>
            Novo post
          </button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <NavegacaoMes mes={mes} onMes={setMes} />
          <button className={btnSecundario} onClick={() => setMes(mesDeHoje())} disabled={mes === mesDeHoje()}>Hoje</button>
        </div>
        <div className="flex gap-2">
          {botaoVisao('mes', 'Mês')}
          {botaoVisao('quadro', 'Quadro por status')}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-texto-suave">
          Cliente
          <select
            className={`${inputCls} mt-1`}
            value={filtroCliente}
            onChange={(e) => {
              setFiltroCliente(e.target.value)
              setFiltroTag('')
            }}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-texto-suave">
          Tag
          <select className={`${inputCls} mt-1`} value={filtroTag} onChange={(e) => setFiltroTag(e.target.value)}>
            <option value="">Todas</option>
            {tagsFiltro.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm text-texto-suave">
        Buscar por tema, legenda ou cliente
        <input className={`${inputCls} mt-1`} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para filtrar o mês" />
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <button type="button" aria-pressed={filtroStatus === ''} onClick={() => setFiltroStatus('')} className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm ${filtroStatus === '' ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave'}`}>
          Todos ({base.length})
        </button>
        {STATUS_POST.filter((s) => contagem(s) > 0 || filtroStatus === s).map((s) => (
          <button key={s} type="button" aria-pressed={filtroStatus === s} onClick={() => setFiltroStatus(filtroStatus === s ? '' : s)} className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm ${filtroStatus === s ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave'}`}>
            {STATUS_POST_ROTULO[s]} ({contagem(s)})
          </button>
        ))}
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={mostrarEventos} onChange={(e) => setMostrarEventos(e.target.checked)} />
        Mostrar clientes de eventos no calendário (aparecem quando o filtro de cliente e de tag está em "Todos")
      </label>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {carregando && <p className="text-sm text-texto-suave">Carregando...</p>}

      {visao === 'mes' ? (
        <CalendarioMensal
          mes={mes}
          posts={filtrados}
          tags={tags}
          mostrarCliente
          eventos={mostrarEventos && !filtroCliente && !filtroTag && !filtroStatus && !termo ? eventos : []}
          onMover={mover}
          onNovo={(data) => setEditor({ post: null, data })}
          onAbrir={abrir}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-3">
            {STATUS_POST.map((status) => {
              const coluna = filtrados.filter((p) => p.status === status)
              return (
                <section key={status} className="w-64 shrink-0 space-y-2 rounded-md border border-linha bg-fundo p-2" aria-label={STATUS_POST_ROTULO[status]}>
                  <h3 className="px-1 text-sm font-medium text-texto">
                    {STATUS_POST_ROTULO[status]} <span className="text-texto-suave">({coluna.length})</span>
                  </h3>
                  {coluna.length === 0 && <p className="px-1 text-xs text-texto-suave">Vazio</p>}
                  {coluna.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <CartaoPost post={p} tags={tags} mostrarCliente mostrarData onAbrir={abrir} />
                      <select aria-label={`Status de ${p.tema || 'post'}`} className={`${inputCls} !min-h-9 !py-1 text-xs`} value={p.status} onChange={(e) => void mudarStatus(p, e.target.value as StatusPost)}>
                        {STATUS_POST.map((st) => (
                          <option key={st} value={st}>{STATUS_POST_ROTULO[st]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
        </div>
      )}
      {visao === 'quadro' && <p className="text-sm text-texto-suave">Mostra os posts do mês selecionado. Troque o status direto no cartão. No calendário do mês, arraste um post para outro dia para reagendar.</p>}
      {editor && (
        <PostEditor
          key={editor.post?.id ?? `novo-${editor.data ?? ''}`}
          post={editor.post}
          dataInicial={editor.data}
          clienteIdInicial={filtroCliente || undefined}
          clientes={clientes}
          tags={tags}
          podeApagar={perfil?.papel === 'dona'}
          onFechar={() => setEditor(null)}
          onSalvo={recarregar}
        />
      )}
    </div>
  )
}
