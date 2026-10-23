import { useState } from 'react'
import CalendarioMensal, { NavegacaoMes } from '../../componentes/CalendarioMensal'
import PostEditor from '../../componentes/PostEditor'
import { Aviso, btnPrimario, inputCls } from '../../componentes/ui'
import { useAuth } from '../../lib/auth'
import { mesDeHoje } from '../../lib/datas'
import { STATUS_POST, STATUS_POST_ROTULO } from '../../lib/tipos'
import type { Cliente, PostCompleto } from '../../lib/tipos'
import { useCalendario } from '../../lib/useCalendario'
import GerenciarTags from './GerenciarTags'

interface Editor {
  post: PostCompleto | null
  data?: string
}

export default function CalendarioCliente({ cliente }: { cliente: Cliente }) {
  const { perfil } = useAuth()
  const [mes, setMes] = useState(mesDeHoje())
  const [filtroTag, setFiltroTag] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const { posts, tags, carregando, erro, recarregar } = useCalendario(mes, cliente.id)

  const dona = perfil?.papel === 'dona'
  const tagsDoCliente = tags.filter((t) => t.cliente_id === null || t.cliente_id === cliente.id)
  const filtrados = posts.filter(
    (p) =>
      (!filtroTag || p.post_tags.some((t) => t.tag_id === filtroTag)) &&
      (!filtroStatus || p.status === filtroStatus),
  )
  const resumo = [{ id: cliente.id, nome: cliente.nome, cor_destaque: cliente.cor_destaque }]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegacaoMes mes={mes} onMes={setMes} />
        <button className={btnPrimario} onClick={() => setEditor({ post: null })}>
          Novo post
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-texto-suave">
          Filtrar por status
          <select className={`${inputCls} mt-1`} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            {STATUS_POST.map((s) => (
              <option key={s} value={s}>
                {STATUS_POST_ROTULO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-texto-suave">
          Filtrar por tag
          <select className={`${inputCls} mt-1`} value={filtroTag} onChange={(e) => setFiltroTag(e.target.value)}>
            <option value="">Todas</option>
            {tagsDoCliente.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {carregando && <p className="text-sm text-texto-suave">Carregando...</p>}
      <CalendarioMensal
        mes={mes}
        posts={filtrados}
        tags={tags}
        onNovo={(data) => setEditor({ post: null, data })}
        onAbrir={(post) => setEditor({ post })}
      />
      <GerenciarTags clienteId={cliente.id} tags={tags} dona={dona} onMudou={recarregar} />
      {editor && (
        <PostEditor
          key={editor.post?.id ?? `novo-${editor.data ?? ''}`}
          post={editor.post}
          dataInicial={editor.data}
          clienteIdInicial={cliente.id}
          clientes={resumo}
          tags={tags}
          podeApagar={dona}
          onFechar={() => setEditor(null)}
          onSalvo={recarregar}
        />
      )}
    </div>
  )
}
