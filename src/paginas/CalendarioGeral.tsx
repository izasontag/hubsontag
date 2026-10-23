import { useState } from 'react'
import CalendarioMensal, { NavegacaoMes } from '../componentes/CalendarioMensal'
import CartaoPost from '../componentes/CartaoPost'
import PostEditor from '../componentes/PostEditor'
import { Aviso, btnPrimario, inputCls } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { mesDeHoje } from '../lib/datas'
import { STATUS_POST, STATUS_POST_ROTULO } from '../lib/tipos'
import type { PostCompleto } from '../lib/tipos'
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
  const [editor, setEditor] = useState<Editor | null>(null)
  const { posts, tags, clientes, carregando, erro, recarregar } = useCalendario(mes)

  const tagsFiltro = tags.filter((t) => !filtroCliente || t.cliente_id === null || t.cliente_id === filtroCliente)
  const filtrados = posts.filter(
    (p) =>
      (!filtroCliente || p.cliente_id === filtroCliente) &&
      (!filtroTag || p.post_tags.some((t) => t.tag_id === filtroTag)),
  )
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-semibold text-marrom">Calendário geral</h1>
        <button className={btnPrimario} onClick={() => setEditor({ post: null })} disabled={clientes.length === 0}>
          Novo post
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegacaoMes mes={mes} onMes={setMes} />
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
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {carregando && <p className="text-sm text-texto-suave">Carregando...</p>}

      {visao === 'mes' ? (
        <CalendarioMensal
          mes={mes}
          posts={filtrados}
          tags={tags}
          mostrarCliente
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
                    <CartaoPost key={p.id} post={p} tags={tags} mostrarCliente mostrarData onAbrir={abrir} />
                  ))}
                </section>
              )
            })}
          </div>
        </div>
      )}
      {visao === 'quadro' && <p className="text-sm text-texto-suave">Mostra os posts do mês selecionado. Para mudar o status, abra o post.</p>}
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
