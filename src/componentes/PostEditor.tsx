import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { dataDeHoje } from '../lib/datas'
import { supabase } from '../lib/supabase'
import {
  DESEMPENHO_ROTULO,
  FORMATO_ROTULO,
  FORMATOS,
  STATUS_POST,
  STATUS_POST_ROTULO,
} from '../lib/tipos'
import type { ClienteResumo, Desempenho, FormatoPost, Midia, PostCompleto, StatusPost, Tag } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, inputCls } from './ui'

interface Props {
  post: PostCompleto | null
  dataInicial?: string
  clienteIdInicial?: string
  clientes: ClienteResumo[]
  tags: Tag[]
  podeApagar: boolean
  onFechar: () => void
  onSalvo: () => void
}

const TAMANHO_MAXIMO = 10 * 1024 * 1024

const nuloSeVazio = (v: string) => (v.trim() === '' ? null : v.trim())
const numeroOuNulo = (v: string) => {
  if (v.trim() === '') return null
  const n = Math.round(Number(v))
  return Number.isNaN(n) ? null : Math.max(0, n)
}

interface MidiaComLink extends Midia {
  url?: string
}

export default function PostEditor({ post, dataInicial, clienteIdInicial, clientes, tags, podeApagar, onFechar, onSalvo }: Props) {
  const [postId, setPostId] = useState<string | null>(post?.id ?? null)
  const [clienteId, setClienteId] = useState(post?.cliente_id ?? clienteIdInicial ?? clientes[0]?.id ?? '')
  const [data, setData] = useState(post?.data_publicacao ?? dataInicial ?? dataDeHoje())
  const [horario, setHorario] = useState(post?.horario?.slice(0, 5) ?? '')
  const [formato, setFormato] = useState<FormatoPost>(post?.formato ?? 'post_unico')
  const [status, setStatus] = useState<StatusPost>(post?.status ?? 'ideia')
  const [pilar, setPilar] = useState(post?.pilar ?? '')
  const [formatoCbs, setFormatoCbs] = useState(post?.formato_cbs ?? '')
  const [tema, setTema] = useState(post?.tema ?? '')
  const [gancho, setGancho] = useState(post?.gancho ?? '')
  const [copia, setCopia] = useState(post?.copy ?? '')
  const [legenda, setLegenda] = useState(post?.legenda ?? '')
  const [prazoInterno, setPrazoInterno] = useState(post?.prazo_interno ?? '')
  const [desempenho, setDesempenho] = useState<Desempenho | ''>(post?.desempenho ?? '')
  const [alcance, setAlcance] = useState(post?.alcance?.toString() ?? '')
  const [salvamentos, setSalvamentos] = useState(post?.salvamentos?.toString() ?? '')
  const [compartilhamentos, setCompartilhamentos] = useState(post?.compartilhamentos?.toString() ?? '')
  const [comentariosQtd, setComentariosQtd] = useState(post?.comentarios_qtd?.toString() ?? '')
  const [nota, setNota] = useState(post?.nota_desempenho ?? '')
  const [tagsEscolhidas, setTagsEscolhidas] = useState<string[]>(post?.post_tags.map((t) => t.tag_id) ?? [])

  const [midias, setMidias] = useState<MidiaComLink[]>([])
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const tagsDoCliente = tags.filter((t) => t.cliente_id === null || t.cliente_id === clienteId)
  const mostrarDesempenho = status === 'publicado' || Boolean(post?.desempenho)

  useEffect(() => {
    const aoApertar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', aoApertar)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoApertar)
      document.body.style.overflow = anterior
    }
  }, [onFechar])

  const carregarMidias = useCallback(async (id: string) => {
    const { data: linhas } = await supabase.from('post_midias').select('*').eq('post_id', id).order('ordem')
    const lista = (linhas as Midia[]) ?? []
    if (lista.length === 0) return setMidias([])
    const { data: links } = await supabase.storage.from('posts').createSignedUrls(lista.map((m) => m.caminho_storage), 3600)
    const mapa = new Map((links ?? []).map((l) => [l.path, l.signedUrl]))
    setMidias(lista.map((m) => ({ ...m, url: mapa.get(m.caminho_storage) ?? undefined })))
  }, [])

  useEffect(() => {
    if (post?.id) void carregarMidias(post.id)
  }, [post?.id, carregarMidias])

  const alternarTag = (id: string) =>
    setTagsEscolhidas((atual) => (atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id]))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk('')
    if (!clienteId) return setErro('Escolha o cliente.')
    setSalvando(true)
    const campos = {
      data_publicacao: data,
      horario: horario || null,
      formato,
      status,
      pilar: nuloSeVazio(pilar),
      formato_cbs: nuloSeVazio(formatoCbs),
      tema: nuloSeVazio(tema),
      gancho: nuloSeVazio(gancho),
      copy: nuloSeVazio(copia),
      legenda: nuloSeVazio(legenda),
      prazo_interno: prazoInterno || null,
      desempenho: mostrarDesempenho && desempenho ? desempenho : null,
      alcance: numeroOuNulo(alcance),
      salvamentos: numeroOuNulo(salvamentos),
      compartilhamentos: numeroOuNulo(compartilhamentos),
      comentarios_qtd: numeroOuNulo(comentariosQtd),
      nota_desempenho: nuloSeVazio(nota),
    }
    const resposta = postId
      ? await supabase.from('posts').update(campos).eq('id', postId).select('id').single()
      : await supabase.from('posts').insert({ ...campos, cliente_id: clienteId }).select('id').single()
    if (resposta.error || !resposta.data) {
      setSalvando(false)
      return setErro('Não foi possível salvar o post. Confira os campos.')
    }
    const id = resposta.data.id as string

    // tags: só as que valem para este cliente
    const validas = tagsEscolhidas.filter((t) => tagsDoCliente.some((x) => x.id === t))
    const apagou = await supabase.from('post_tags').delete().eq('post_id', id)
    const gravou = validas.length
      ? await supabase.from('post_tags').insert(validas.map((tag_id) => ({ post_id: id, tag_id })))
      : { error: null }
    setSalvando(false)
    if (apagou.error || gravou.error) return setErro('O post foi salvo, mas não deu para salvar as tags.')

    const eraNovo = !postId
    setPostId(id)
    setOk(eraNovo ? 'Post criado. Agora você pode adicionar as artes.' : 'Salvo.')
    onSalvo()
  }

  async function enviarArtes(arquivos: FileList | null) {
    if (!arquivos || !postId) return
    setErro('')
    setEnviando(true)
    let proxima = midias.reduce((max, m) => Math.max(max, m.ordem), -1) + 1
    for (const arquivo of Array.from(arquivos)) {
      if (!arquivo.type.startsWith('image/')) {
        setErro(`"${arquivo.name}" não é uma imagem.`)
        continue
      }
      if (arquivo.size > TAMANHO_MAXIMO) {
        setErro(`"${arquivo.name}" passa de 10 MB. Reduza o tamanho e envie de novo.`)
        continue
      }
      const extensao = (arquivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const caminho = `${clienteId}/${postId}/${crypto.randomUUID()}.${extensao}`
      const envio = await supabase.storage.from('posts').upload(caminho, arquivo, { contentType: arquivo.type })
      if (envio.error) {
        setErro('Não foi possível enviar uma das artes.')
        continue
      }
      const linha = await supabase.from('post_midias').insert({ post_id: postId, caminho_storage: caminho, ordem: proxima })
      if (linha.error) {
        await supabase.storage.from('posts').remove([caminho])
        setErro('Não foi possível registrar uma das artes.')
        continue
      }
      proxima += 1
    }
    await carregarMidias(postId)
    setEnviando(false)
    onSalvo()
  }

  async function moverArte(indice: number, delta: -1 | 1) {
    if (!postId) return
    const alvo = indice + delta
    if (alvo < 0 || alvo >= midias.length) return
    const nova = [...midias]
    ;[nova[indice], nova[alvo]] = [nova[alvo], nova[indice]]
    const mudou = nova.map((m, i) => ({ m, i })).filter(({ m, i }) => m.ordem !== i)
    await Promise.all(mudou.map(({ m, i }) => supabase.from('post_midias').update({ ordem: i }).eq('id', m.id)))
    await carregarMidias(postId)
    onSalvo()
  }

  async function removerArte(m: MidiaComLink) {
    if (!postId || !window.confirm('Remover esta arte?')) return
    await supabase.storage.from('posts').remove([m.caminho_storage])
    await supabase.from('post_midias').delete().eq('id', m.id)
    await carregarMidias(postId)
    onSalvo()
  }

  async function apagarPost() {
    if (!postId || !window.confirm('Apagar este post e as artes dele? Não dá para desfazer.')) return
    const caminhos = midias.map((m) => m.caminho_storage)
    if (caminhos.length) await supabase.storage.from('posts').remove(caminhos)
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) return setErro('Não foi possível apagar o post.')
    onSalvo()
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-texto/50" role="dialog" aria-modal="true" aria-label={postId ? 'Editar post' : 'Novo post'}>
      <div className="mx-auto min-h-full max-w-3xl bg-fundo p-4 sm:my-6 sm:min-h-0 sm:rounded-md sm:border sm:border-linha sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-titulo text-3xl font-semibold text-marrom">{postId ? 'Editar post' : 'Novo post'}</h2>
          <button type="button" className={btnSecundario} onClick={onFechar}>
            Fechar
          </button>
        </div>

        <form onSubmit={salvar} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Cliente">
              <select className={inputCls} value={clienteId} disabled={Boolean(postId)} onChange={(e) => setClienteId(e.target.value)}>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
                {post && !clientes.some((c) => c.id === post.cliente_id) && (
                  <option value={post.cliente_id}>{post.cliente?.nome}</option>
                )}
              </select>
            </Campo>
            <Campo rotulo="Status">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as StatusPost)}>
                {STATUS_POST.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_POST_ROTULO[s]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Data de publicação">
              <input type="date" required className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo rotulo="Horário">
              <input type="time" className={inputCls} value={horario} onChange={(e) => setHorario(e.target.value)} />
            </Campo>
            <Campo rotulo="Formato">
              <select className={inputCls} value={formato} onChange={(e) => setFormato(e.target.value as FormatoPost)}>
                {FORMATOS.map((f) => (
                  <option key={f} value={f}>
                    {FORMATO_ROTULO[f]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Prazo interno (o cliente não vê)">
              <input type="date" className={inputCls} value={prazoInterno} onChange={(e) => setPrazoInterno(e.target.value)} />
            </Campo>
            <Campo rotulo="Pilar">
              <input className={inputCls} value={pilar} onChange={(e) => setPilar(e.target.value)} />
            </Campo>
            <Campo rotulo="Formato CBS (antes e depois, lista, POV...)">
              <input className={inputCls} value={formatoCbs} onChange={(e) => setFormatoCbs(e.target.value)} />
            </Campo>
          </div>
          <Campo rotulo="Tema">
            <input className={inputCls} value={tema} onChange={(e) => setTema(e.target.value)} />
          </Campo>
          <Campo rotulo="Gancho">
            <textarea rows={2} className={inputCls} value={gancho} onChange={(e) => setGancho(e.target.value)} />
          </Campo>
          <Campo rotulo="Copy (texto das artes ou roteiro)">
            <textarea rows={6} className={inputCls} value={copia} onChange={(e) => setCopia(e.target.value)} />
          </Campo>
          <Campo rotulo="Legenda">
            <textarea rows={6} className={inputCls} value={legenda} onChange={(e) => setLegenda(e.target.value)} />
          </Campo>

          <fieldset>
            <legend className="mb-1 text-sm text-texto-suave">Tags</legend>
            {tagsDoCliente.length === 0 ? (
              <p className="text-sm text-texto-suave">Nenhuma tag ainda. Crie em "Tags" na aba Calendário do cliente.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagsDoCliente.map((t) => {
                  const ligada = tagsEscolhidas.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={ligada}
                      onClick={() => alternarTag(t.id)}
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 text-sm ${
                        ligada ? 'border-marrom bg-superficie font-medium text-texto' : 'border-linha text-texto-suave'
                      }`}
                    >
                      <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: t.cor }} />
                      {t.nome}
                      {ligada && <span className="sr-only"> (marcada)</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>

          {mostrarDesempenho && (
            <fieldset className="space-y-4 rounded-md border border-linha bg-superficie p-4">
              <legend className="px-1 font-titulo text-xl font-semibold text-marrom">Desempenho</legend>
              <Campo rotulo="Resultado">
                <select className={inputCls} value={desempenho} onChange={(e) => setDesempenho(e.target.value as Desempenho | '')}>
                  <option value="">Ainda não avaliado</option>
                  {(Object.keys(DESEMPENHO_ROTULO) as Desempenho[]).map((d) => (
                    <option key={d} value={d}>
                      {DESEMPENHO_ROTULO[d]}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="Alcance">
                  <input type="number" min={0} className={inputCls} value={alcance} onChange={(e) => setAlcance(e.target.value)} />
                </Campo>
                <Campo rotulo="Salvamentos">
                  <input type="number" min={0} className={inputCls} value={salvamentos} onChange={(e) => setSalvamentos(e.target.value)} />
                </Campo>
                <Campo rotulo="Compartilhamentos">
                  <input type="number" min={0} className={inputCls} value={compartilhamentos} onChange={(e) => setCompartilhamentos(e.target.value)} />
                </Campo>
                <Campo rotulo="Comentários">
                  <input type="number" min={0} className={inputCls} value={comentariosQtd} onChange={(e) => setComentariosQtd(e.target.value)} />
                </Campo>
              </div>
              <Campo rotulo="Sua explicação do resultado">
                <textarea rows={3} className={inputCls} value={nota} onChange={(e) => setNota(e.target.value)} />
              </Campo>
            </fieldset>
          )}

          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {ok && <Aviso tipo="ok">{ok}</Aviso>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={salvando} className={btnPrimario}>
              {salvando ? 'Salvando...' : postId ? 'Salvar alterações' : 'Criar post'}
            </button>
            {postId && podeApagar && (
              <button type="button" className={btnSecundario} onClick={() => void apagarPost()}>
                Apagar post
              </button>
            )}
          </div>
        </form>

        <section className="mt-8 space-y-3 border-t border-linha pt-6">
          <h3 className="font-titulo text-2xl font-semibold text-marrom">Artes</h3>
          {!postId ? (
            <p className="text-sm text-texto-suave">Salve o post primeiro para poder adicionar as artes.</p>
          ) : (
            <>
              <p className="text-sm text-texto-suave">
                Imagens de até 10 MB. A primeira é a miniatura no calendário. Para Reels, envie a capa.
              </p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {midias.map((m, i) => (
                  <li key={m.id} className="space-y-2 rounded-sm border border-linha bg-superficie p-2">
                    {m.url ? (
                      <img src={m.url} alt={`Arte ${i + 1}`} className="aspect-square w-full rounded-sm object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded-sm bg-linha" />
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-texto-suave">Arte {i + 1}</span>
                      <span className="flex gap-1">
                        <button type="button" aria-label={`Mover arte ${i + 1} para trás`} disabled={i === 0} onClick={() => void moverArte(i, -1)} className="h-11 w-11 cursor-pointer rounded-sm border border-linha disabled:opacity-40">
                          &larr;
                        </button>
                        <button type="button" aria-label={`Mover arte ${i + 1} para frente`} disabled={i === midias.length - 1} onClick={() => void moverArte(i, 1)} className="h-11 w-11 cursor-pointer rounded-sm border border-linha disabled:opacity-40">
                          &rarr;
                        </button>
                      </span>
                    </div>
                    <button type="button" className={`${btnSecundario} w-full`} onClick={() => void removerArte(m)}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
              <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom ${enviando ? 'opacity-50' : ''}`}>
                {enviando ? 'Enviando...' : 'Adicionar artes'}
                <input type="file" accept="image/*" multiple className="sr-only" disabled={enviando} onChange={(e) => { void enviarArtes(e.target.files); e.target.value = '' }} />
              </label>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
