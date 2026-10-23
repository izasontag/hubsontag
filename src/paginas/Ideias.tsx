import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { EditarIdeia, VirarPost } from '../componentes/ModaisIdeia'
import { Revelar } from '../componentes/animacao'
import { Aviso, btnPrimario, btnSecundario, CabecalhoPagina, Campo, Cartao, Esqueleto, formatarData, inputCls } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { enviarArquivoIdeia, lerTags } from '../lib/ideias'
import { supabase } from '../lib/supabase'
import { TIPO_IDEIA_ROTULO, TIPOS_IDEIA } from '../lib/tipos'
import type { ClienteResumo, Ideia, TipoIdeia } from '../lib/tipos'

export default function Ideias() {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [ideias, setIdeias] = useState<Ideia[] | null>(null)
  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [links, setLinks] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  // captura rápida
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<TipoIdeia>('ideia_post')
  const [clienteId, setClienteId] = useState('')
  const [tags, setTags] = useState('')
  const [fonte, setFonte] = useState('')
  const [paraSontag, setParaSontag] = useState(false)
  const [anexos, setAnexos] = useState<File[]>([])
  const [salvando, setSalvando] = useState(false)
  // filtros
  const [fTipo, setFTipo] = useState('')
  const [fCliente, setFCliente] = useState('')
  const [fTag, setFTag] = useState('')
  const [busca, setBusca] = useState('')
  // janelas
  const [editando, setEditando] = useState<Ideia | null>(null)
  const [virando, setVirando] = useState<Ideia | null>(null)

  const carregar = useCallback(async () => {
    const [i, c] = await Promise.all([
      supabase
        .from('ideias')
        .select('*, ideia_arquivos(id, ideia_id, caminho_storage, nome, tipo, ordem)')
        .order('criado_em', { ascending: false })
        .limit(300),
      supabase.from('clientes').select('id, nome, cor_destaque').neq('status', 'encerrado').order('nome'),
    ])
    if (i.error) return setErro('Não foi possível carregar as ideias.')
    const lista = (i.data as Ideia[]).map((x) => ({
      ...x,
      ideia_arquivos: [...x.ideia_arquivos].sort((a, b) => a.ordem - b.ordem),
    }))
    setIdeias(lista)
    setClientes((c.data as ClienteResumo[]) ?? [])
    const caminhos = lista.flatMap((x) => x.ideia_arquivos.map((a) => a.caminho_storage))
    if (caminhos.length === 0) return setLinks({})
    const { data } = await supabase.storage.from('ideias').createSignedUrls(caminhos, 3600)
    const mapa: Record<string, string> = {}
    for (const l of data ?? []) if (l.path && l.signedUrl) mapa[l.path] = l.signedUrl
    setLinks(mapa)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function capturar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setSalvando(true)
    const { data, error } = await supabase
      .from('ideias')
      .insert({
        texto: texto.trim(),
        tipo,
        cliente_id: clienteId || null,
        para_sontag: dona ? paraSontag : false,
        tags: lerTags(tags),
        fonte: fonte.trim() || null,
      })
      .select('id')
      .single()
    if (error || !data) {
      setSalvando(false)
      return setErro('Não foi possível salvar a ideia.')
    }
    const falhas: string[] = []
    for (let i = 0; i < anexos.length; i += 1) {
      const problema = await enviarArquivoIdeia(data.id as string, anexos[i], i)
      if (problema) falhas.push(problema)
    }
    setSalvando(false)
    setTexto('')
    setTags('')
    setFonte('')
    setAnexos([])
    if (falhas.length) setErro(`${falhas.join(' ')} A ideia foi salva; abra "Editar" para tentar de novo.`)
    else setMsg('Ideia salva.')
    void carregar()
  }

  async function apagar(i: Ideia) {
    if (!window.confirm('Apagar esta ideia e os arquivos dela?')) return
    const caminhos = i.ideia_arquivos.map((a) => a.caminho_storage)
    if (caminhos.length) await supabase.storage.from('ideias').remove(caminhos)
    const { error } = await supabase.from('ideias').delete().eq('id', i.id)
    if (error) setErro('Não foi possível apagar a ideia.')
    void carregar()
  }

  const nomeCliente = (id: string | null) => clientes.find((c) => c.id === id)?.nome ?? 'Cliente'
  const termo = busca.trim().toLowerCase()
  const visiveis = (ideias ?? []).filter(
    (i) =>
      (!fTipo || i.tipo === fTipo) &&
      (!fCliente || (fCliente === 'geral' ? i.cliente_id === null && !i.para_sontag : fCliente === 'sontag' ? i.para_sontag : i.cliente_id === fCliente)) &&
      (!fTag.trim() || i.tags.includes(fTag.trim().toLowerCase().replace(/^#/, ''))) &&
      (!termo || i.texto.toLowerCase().includes(termo)),
  )
  const todasTags = [...new Set((ideias ?? []).flatMap((i) => i.tags))].sort()

  return (
    <div className="space-y-6">
      <CabecalhoPagina rotulo="Banco de ideias" titulo="Ideias" />

      <Cartao>
        <form onSubmit={capturar} className="space-y-3">
          <label className="block text-sm text-texto-suave" htmlFor="nova-ideia">
            Anote a ideia
          </label>
          <textarea id="nova-ideia" required rows={3} className={inputCls} placeholder="Uma ideia, um filme que vale usar de referência, uma trend..." value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Tipo">
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoIdeia)}>
                {TIPOS_IDEIA.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_IDEIA_ROTULO[t]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Cliente">
              <select className={inputCls} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Geral</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <details>
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-musgo underline">Mais opções (tags, fonte)</summary>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Tags (separe por vírgula)">
                <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
              </Campo>
              <Campo rotulo="Fonte (link ou anotação)">
                <input className={inputCls} value={fonte} onChange={(e) => setFonte(e.target.value)} />
              </Campo>
            </div>
            {dona && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5" checked={paraSontag} onChange={(e) => setParaSontag(e.target.checked)} />
                Ideia para a própria Sontag (só você vê)
              </label>
            )}
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom`}>
              Anexar arquivos
              <input type="file" multiple className="sr-only" onChange={(e) => { setAnexos([...anexos, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
            </label>
            <button type="submit" disabled={salvando} className={btnPrimario}>
              {salvando ? 'Salvando...' : 'Salvar ideia'}
            </button>
          </div>
          {anexos.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {anexos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-sm border border-linha px-2 py-1">
                  {f.name}
                  <button type="button" aria-label={`Tirar ${f.name}`} className="h-8 w-8 cursor-pointer text-texto-suave" onClick={() => setAnexos(anexos.filter((_, k) => k !== i))}>
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </Cartao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm text-texto-suave">
          Tipo
          <select className={`${inputCls} mt-1`} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_IDEIA.map((t) => (
              <option key={t} value={t}>
                {TIPO_IDEIA_ROTULO[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-texto-suave">
          Cliente
          <select className={`${inputCls} mt-1`} value={fCliente} onChange={(e) => setFCliente(e.target.value)}>
            <option value="">Todos</option>
            <option value="geral">Geral</option>
            {dona && <option value="sontag">Para a Sontag</option>}
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-texto-suave">
          Tag
          <select className={`${inputCls} mt-1`} value={fTag} onChange={(e) => setFTag(e.target.value)}>
            <option value="">Todas</option>
            {todasTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-texto-suave">
          Buscar no texto
          <input className={`${inputCls} mt-1`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      </div>

      {ideias === null && !erro && (
        <div className="grid gap-4 md:grid-cols-2" aria-label="Carregando ideias">
          <Esqueleto className="h-40" />
          <Esqueleto className="h-40" />
        </div>
      )}
      {ideias && visiveis.length === 0 && <p className="text-texto-suave">Nenhuma ideia encontrada.</p>}

      <ul className="grid gap-4 md:grid-cols-2">
        {visiveis.map((i, n) => (
          <li key={i.id}>
            <Revelar ordem={n % 4} className="h-full">
          <div className="flex h-full flex-col gap-3 rounded-md border border-linha bg-superficie p-4 shadow-suave transition duration-300 hover:-translate-y-0.5 hover:shadow-elevada">
            <div className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
              <span className="rounded-sm border border-linha px-1.5 py-0.5">{TIPO_IDEIA_ROTULO[i.tipo]}</span>
              <span>{i.para_sontag ? 'Para a Sontag' : i.cliente_id ? nomeCliente(i.cliente_id) : 'Geral'}</span>
              <span>· {formatarData(i.criado_em.slice(0, 10))}</span>
            </div>
            <p className="whitespace-pre-wrap">{i.texto}</p>
            {i.fonte && (/^https?:\/\//i.test(i.fonte) ? (
              <a href={i.fonte} target="_blank" rel="noreferrer noopener" className="break-all text-sm text-musgo underline">
                {i.fonte}
              </a>
            ) : (
              <p className="text-sm text-texto-suave">Fonte: {i.fonte}</p>
            ))}
            {i.tags.length > 0 && (
              <p className="flex flex-wrap gap-1 text-xs">
                {i.tags.map((t) => (
                  <span key={t} className="rounded-sm border border-linha px-1.5 py-0.5 text-texto-suave">
                    #{t}
                  </span>
                ))}
              </p>
            )}
            {i.ideia_arquivos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {i.ideia_arquivos.map((a) => {
                  const url = links[a.caminho_storage]
                  if (!url) return null
                  return (
                    <li key={a.id}>
                      {a.tipo === 'imagem' && (
                        <a href={url} target="_blank" rel="noreferrer noopener">
                          <img src={url} alt={a.nome} loading="lazy" className="h-24 w-24 rounded-sm border border-linha object-cover" />
                        </a>
                      )}
                      {a.tipo === 'video' && <video src={url} controls preload="metadata" aria-label={a.nome} className="h-24 rounded-sm bg-texto" />}
                      {a.tipo === 'arquivo' && (
                        <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-sm border border-linha px-3 text-sm text-musgo underline">
                          {a.nome}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              {i.post_id ? (
                <span className="inline-flex min-h-11 items-center text-sm text-musgo">Já virou post</span>
              ) : (
                <button className={btnPrimario} onClick={() => setVirando(i)} disabled={i.para_sontag}>
                  Virar post
                </button>
              )}
              <button className={btnSecundario} onClick={() => setEditando(i)}>
                Editar
              </button>
              <button className={btnSecundario} onClick={() => void apagar(i)}>
                Apagar
              </button>
            </div>
          </div>
            </Revelar>
          </li>
        ))}
      </ul>

      {editando && (
        <EditarIdeia
          key={editando.id}
          ideia={editando}
          clientes={clientes}
          dona={dona}
          linksArquivos={links}
          onFechar={() => setEditando(null)}
          onMudou={() => void carregar()}
        />
      )}
      {virando && <VirarPost key={virando.id} ideia={virando} clientes={clientes} onFechar={() => setVirando(null)} onCriado={() => void carregar()} />}
    </div>
  )
}
