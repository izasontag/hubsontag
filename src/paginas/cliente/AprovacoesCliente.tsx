import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import CartaoFeed from '../../componentes/CartaoFeed'
import NovoPostRapido from '../../componentes/NovoPostRapido'
import PostEditor from '../../componentes/PostEditor'
import { SeloStatus } from '../../componentes/Selos'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { useAuth } from '../../lib/auth'
import { dataDeHoje } from '../../lib/datas'
import { formatarDataHora } from '../../lib/portal'
import { paraVista } from '../../lib/midias'
import { supabase } from '../../lib/supabase'
import type { Cliente, PostCompleto, Rodada, Tag } from '../../lib/tipos'

interface Retorno {
  ajuste: string | null
  ajusteEm: string | null
  comentarios: number
}

const somarDias = (data: string, dias: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const n = new Date(a, m - 1, d + dias)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
const curta = (d: string) => formatarData(d).slice(0, 5)
const EM_PRODUCAO = ['ideia', 'roteiro', 'design']

export default function AprovacoesCliente({ cliente }: { cliente: Cliente }) {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [rodadas, setRodadas] = useState<Rodada[] | null>(null)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostCompleto[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [retornos, setRetornos] = useState<Record<string, Retorno>>({})
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [novaRodada, setNovaRodada] = useState(false)
  const [novoPost, setNovoPost] = useState(false)
  const [editando, setEditando] = useState<PostCompleto | null>(null)
  const [versao, setVersao] = useState(0)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const rodada = useMemo(() => rodadas?.find((r) => r.id === escolhida) ?? null, [rodadas, escolhida])

  useEffect(() => {
    supabase
      .from('rodadas')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) return setErro('Não foi possível carregar as rodadas.')
        const lista = (data as Rodada[]) ?? []
        setRodadas(lista)
        setEscolhida((atual) => (atual && lista.some((r) => r.id === atual) ? atual : (lista[0]?.id ?? null)))
      })
  }, [cliente.id, versao])

  useEffect(() => {
    if (!escolhida) return
    let ativo = true
    async function carregar() {
      const [p, t] = await Promise.all([
        supabase
          .from('posts')
          .select('*, cliente:clientes(nome, cor_destaque), post_tags(tag_id), post_midias(id, post_id, caminho_storage, ordem, tipo, link_externo, capa_storage)')
          .eq('rodada_id', escolhida)
          .order('data_publicacao')
          .order('horario', { nullsFirst: true }),
        supabase.from('tags').select('*').order('nome'),
      ])
      if (!ativo || p.error) return
      const lista = (p.data as PostCompleto[]).map((x) => ({
        ...x,
        post_midias: [...x.post_midias].sort((a, b) => a.ordem - b.ordem),
      }))
      setPosts(lista)
      setTags((t.data as Tag[]) ?? [])
      const ids = lista.map((x) => x.id)
      if (ids.length === 0) return setRetornos({})
      const [ap, co] = await Promise.all([
        supabase.from('aprovacoes').select('post_id, decisao, mensagem, criado_em').in('post_id', ids),
        supabase.from('comentarios').select('post_id, origem').in('post_id', ids),
      ])
      if (!ativo) return
      const mapa: Record<string, Retorno> = {}
      for (const id of ids) mapa[id] = { ajuste: null, ajusteEm: null, comentarios: 0 }
      for (const a of ap.data ?? []) {
        const r = mapa[a.post_id as string]
        if (a.decisao === 'ajuste_pedido' && (!r.ajusteEm || (a.criado_em as string) > r.ajusteEm)) {
          r.ajuste = a.mensagem as string | null
          r.ajusteEm = a.criado_em as string
        }
      }
      for (const c of co.data ?? []) if (c.origem === 'portal') mapa[c.post_id as string].comentarios += 1
      setRetornos(mapa)
    }
    void carregar()
    return () => {
      ativo = false
    }
  }, [escolhida, versao])

  const rascunhos = posts.filter((p) => EM_PRODUCAO.includes(p.status))
  const semArte = rascunhos.filter((p) => p.post_midias.length === 0)
  const pendentes = posts.filter((p) => p.status === 'em_aprovacao').length
  const ajustes = posts.filter((p) => p.status === 'ajuste_pedido').length
  const respondidos = posts.filter((p) => !EM_PRODUCAO.includes(p.status) && p.status !== 'em_aprovacao').length

  async function criarRodada(inicio: string, fim: string, titulo: string) {
    setErro('')
    const { data, error } = await supabase
      .from('rodadas')
      .insert({ cliente_id: cliente.id, titulo, inicio: inicio || null, fim: fim || null })
      .select()
      .single()
    if (error || !data) return setErro('Não foi possível criar a rodada.')
    setNovaRodada(false)
    setEscolhida((data as Rodada).id)
    recarregar()
  }

  async function enviar() {
    if (!rodada) return
    setMsg('')
    setErro('')
    const aviso =
      semArte.length > 0
        ? `${semArte.length} post(s) ainda estão sem arte. Enviar mesmo assim? O cliente vai ver "Arte ainda não disponível".`
        : `Enviar ${rascunhos.length} post(s) ao cliente para aprovação?`
    if (!window.confirm(aviso)) return
    const { data, error } = await supabase.rpc('enviar_rodada', { p_rodada: rodada.id })
    if (error) return setErro('Não foi possível enviar a rodada.')
    setMsg(`${data as number} post(s) enviados. Agora copie o link do portal e mande ao cliente.`)
    recarregar()
  }

  async function copiarLink() {
    setMsg('')
    setErro('')
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/portal/${cliente.token_portal}`)
      setMsg('Link do portal copiado.')
    } catch {
      setErro('Não deu para copiar. Use a aba Portal para ver o link.')
    }
  }

  async function apagarRodada() {
    if (!rodada || !window.confirm('Apagar esta rodada? Os posts continuam existindo, só saem da rodada.')) return
    const { error } = await supabase.from('rodadas').delete().eq('id', rodada.id)
    if (error) return setErro('Não foi possível apagar a rodada.')
    setEscolhida(null)
    recarregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-60 flex-1">
          {rodadas && rodadas.length > 0 && (
            <label className="block text-sm text-texto-suave">
              Rodada
              <select className={`${inputCls} mt-1`} value={escolhida ?? ''} onChange={(e) => setEscolhida(e.target.value)}>
                {rodadas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo} ({r.status === 'enviada' ? 'enviada' : 'rascunho'})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button className={btnPrimario} onClick={() => setNovaRodada(true)}>
          Nova rodada
        </button>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      {novaRodada && <FormRodada onCriar={criarRodada} onCancelar={() => setNovaRodada(false)} />}

      {rodadas && rodadas.length === 0 && !novaRodada && (
        <Cartao className="space-y-2">
          <Titulo>Comece pela primeira rodada</Titulo>
          <p className="text-texto-suave">
            Uma rodada é o conjunto de posts que você envia ao cliente de uma vez, normalmente a quinzena. Você monta tudo
            em rascunho e libera com um clique.
          </p>
        </Cartao>
      )}

      {rodada && (
        <>
          <Cartao className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Titulo>{rodada.titulo}</Titulo>
                <p className="text-sm text-texto-suave">
                  {rodada.inicio && rodada.fim ? `${formatarData(rodada.inicio)} a ${formatarData(rodada.fim)}` : 'Sem período definido'}
                </p>
              </div>
              <span className={`rounded-sm border px-2 py-1 text-sm ${rodada.status === 'enviada' ? 'border-musgo text-musgo' : 'border-linha text-texto-suave'}`}>
                {rodada.status === 'enviada' && rodada.enviada_em ? `Enviada em ${formatarDataHora(rodada.enviada_em)}` : 'Rascunho'}
              </span>
            </div>

            {rodada.status === 'rascunho' ? (
              <p className="text-sm text-texto-suave">O cliente ainda não vê esta rodada. Monte os posts e envie quando estiver pronta.</p>
            ) : (
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-sm border border-linha p-3">
                  <dt className="text-xs text-texto-suave">Esperando o cliente</dt>
                  <dd className="font-titulo text-3xl text-marrom">{pendentes}</dd>
                </div>
                <div className="rounded-sm border border-linha p-3">
                  <dt className="text-xs text-texto-suave">Ajustes pedidos</dt>
                  <dd className="font-titulo text-3xl text-marrom">{ajustes}</dd>
                </div>
                <div className="rounded-sm border border-linha p-3">
                  <dt className="text-xs text-texto-suave">Aprovados</dt>
                  <dd className="font-titulo text-3xl text-musgo">{respondidos}</dd>
                </div>
              </dl>
            )}

            <div className="flex flex-wrap gap-3">
              <button className={btnSecundario} onClick={() => setNovoPost(true)}>
                Adicionar post
              </button>
              {rascunhos.length > 0 && (
                <button className={btnPrimario} onClick={() => void enviar()}>
                  {rodada.status === 'rascunho' ? `Enviar rodada ao cliente (${rascunhos.length})` : `Enviar ${rascunhos.length} novo(s) post(s)`}
                </button>
              )}
              {rodada.status === 'enviada' && (
                <button className={btnSecundario} onClick={() => void copiarLink()}>
                  Copiar link do portal
                </button>
              )}
              {dona && (
                <button className={btnSecundario} onClick={() => void apagarRodada()}>
                  Apagar rodada
                </button>
              )}
            </div>
            {rodada.status === 'enviada' && !cliente.portal_ativo && (
              <Aviso tipo="erro">O portal deste cliente está desativado. Ative na aba Portal para ele conseguir abrir o link.</Aviso>
            )}
          </Cartao>

          {posts.length === 0 && <p className="text-texto-suave">Nenhum post nesta rodada ainda. Clique em "Adicionar post".</p>}

          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((p) => {
              const r = retornos[p.id]
              return (
                <CartaoFeed
                  key={p.id}
                  cliente={cliente}
                  post={{ ...p, midias: p.post_midias.map(paraVista) }}
                  topo={<SeloStatus status={p.status} />}
                >
                  {p.status === 'ajuste_pedido' && r?.ajuste && (
                    <div className="rounded-sm border border-marrom p-3 text-sm">
                      <p className="font-medium text-marrom">Ajuste pedido{r.ajusteEm ? ` em ${formatarDataHora(r.ajusteEm)}` : ''}</p>
                      <p className="whitespace-pre-wrap">{r.ajuste}</p>
                    </div>
                  )}
                  {r && r.comentarios > 0 && <p className="text-sm text-texto-suave">{r.comentarios} comentário(s) do cliente</p>}
                  {p.post_midias.length === 0 && EM_PRODUCAO.includes(p.status) && (
                    <p className="text-sm text-marrom">Este post ainda não tem arte.</p>
                  )}
                  <button className={btnSecundario} onClick={() => setEditando(p)}>
                    Editar e ver conversa
                  </button>
                </CartaoFeed>
              )
            })}
          </div>
        </>
      )}

      {novoPost && rodada && (
        <NovoPostRapido cliente={cliente} rodada={rodada} onFechar={() => setNovoPost(false)} onCriado={recarregar} />
      )}
      {editando && (
        <PostEditor
          key={editando.id}
          post={editando}
          clienteIdInicial={cliente.id}
          clientes={[{ id: cliente.id, nome: cliente.nome, cor_destaque: cliente.cor_destaque }]}
          tags={tags}
          podeApagar={dona}
          onFechar={() => setEditando(null)}
          onSalvo={recarregar}
        />
      )}
    </div>
  )
}

function FormRodada({ onCriar, onCancelar }: { onCriar: (inicio: string, fim: string, titulo: string) => void; onCancelar: () => void }) {
  const [inicio, setInicio] = useState(dataDeHoje())
  const [fim, setFim] = useState(somarDias(dataDeHoje(), 14))
  const [titulo, setTitulo] = useState('')
  const sugestao = inicio && fim ? `Rodada de ${curta(inicio)} a ${curta(fim)}` : 'Nova rodada'

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onCriar(inicio, fim, titulo.trim() || sugestao)
  }

  return (
    <Cartao>
      <form onSubmit={enviar} className="space-y-4">
        <Titulo>Nova rodada</Titulo>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Início do período">
            <input type="date" className={inputCls} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
          <Campo rotulo="Fim do período">
            <input type="date" className={inputCls} value={fim} onChange={(e) => setFim(e.target.value)} />
          </Campo>
          <Campo rotulo="Nome da rodada">
            <input className={inputCls} placeholder={sugestao} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </Campo>
        </div>
        <div className="flex gap-3">
          <button type="submit" className={btnPrimario}>
            Criar rodada
          </button>
          <button type="button" className={btnSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </Cartao>
  )
}
