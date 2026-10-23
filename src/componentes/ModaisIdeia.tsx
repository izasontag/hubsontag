import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { dataDeHoje } from '../lib/datas'
import { enviarArquivoIdeia, lerTags } from '../lib/ideias'
import { linkValido } from '../lib/midias'
import { supabase } from '../lib/supabase'
import { TIPO_IDEIA_ROTULO, TIPOS_IDEIA } from '../lib/tipos'
import type { ArquivoIdeia, ClienteResumo, Ideia, TipoIdeia } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, inputCls } from './ui'

function Moldura({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
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
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-texto/50" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="mx-auto min-h-full max-w-2xl bg-fundo p-4 sm:my-6 sm:min-h-0 sm:rounded-md sm:border sm:border-linha sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-titulo text-3xl font-semibold text-marrom">{titulo}</h2>
          <button type="button" className={btnSecundario} onClick={onFechar}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface PropsEditar {
  ideia: Ideia
  clientes: ClienteResumo[]
  dona: boolean
  linksArquivos: Record<string, string>
  onFechar: () => void
  onMudou: () => void
}

export function EditarIdeia({ ideia, clientes, dona, linksArquivos, onFechar, onMudou }: PropsEditar) {
  const [texto, setTexto] = useState(ideia.texto)
  const [tipo, setTipo] = useState<TipoIdeia>(ideia.tipo)
  const [clienteId, setClienteId] = useState(ideia.cliente_id ?? '')
  const [paraSontag, setParaSontag] = useState(ideia.para_sontag)
  const [tags, setTags] = useState(ideia.tags.join(', '))
  const [fonte, setFonte] = useState(ideia.fonte ?? '')
  const [arquivos, setArquivos] = useState<ArquivoIdeia[]>(ideia.ideia_arquivos)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk(false)
    if (fonte.trim() && !linkValido(fonte) && !/\s/.test(fonte.trim()) && /^[a-z]+:/i.test(fonte.trim())) {
      return setErro('Se a fonte for um link, ele precisa começar com http:// ou https://')
    }
    const { error } = await supabase
      .from('ideias')
      .update({
        texto: texto.trim(),
        tipo,
        cliente_id: clienteId || null,
        para_sontag: dona ? paraSontag : false,
        tags: lerTags(tags),
        fonte: fonte.trim() || null,
      })
      .eq('id', ideia.id)
    if (error) return setErro('Não foi possível salvar.')
    setOk(true)
    onMudou()
  }

  async function adicionar(lista: FileList | null) {
    if (!lista) return
    setErro('')
    setEnviando(true)
    let ordem = arquivos.reduce((m, a) => Math.max(m, a.ordem), -1) + 1
    for (const f of Array.from(lista)) {
      const problema = await enviarArquivoIdeia(ideia.id, f, ordem)
      if (problema) setErro(problema)
      else ordem += 1
    }
    const { data } = await supabase.from('ideia_arquivos').select('*').eq('ideia_id', ideia.id).order('ordem')
    setArquivos((data as ArquivoIdeia[]) ?? [])
    setEnviando(false)
    onMudou()
  }

  async function tirar(a: ArquivoIdeia) {
    if (!window.confirm(`Remover "${a.nome}"?`)) return
    await supabase.storage.from('ideias').remove([a.caminho_storage])
    await supabase.from('ideia_arquivos').delete().eq('id', a.id)
    setArquivos((atual) => atual.filter((x) => x.id !== a.id))
    onMudou()
  }

  return (
    <Moldura titulo="Editar ideia" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Ideia">
          <textarea required rows={5} className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
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
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {ok && <Aviso tipo="ok">Salvo.</Aviso>}
        <button type="submit" className={btnPrimario}>
          Salvar alterações
        </button>
      </form>

      <section className="mt-8 space-y-3 border-t border-linha pt-6">
        <h3 className="font-titulo text-2xl font-semibold text-marrom">Arquivos</h3>
        {arquivos.length === 0 && <p className="text-sm text-texto-suave">Nenhum arquivo.</p>}
        <ul className="divide-y divide-linha">
          {arquivos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <a href={linksArquivos[a.caminho_storage]} target="_blank" rel="noreferrer noopener" className="min-w-0 break-all text-sm text-musgo underline">
                {a.nome}
              </a>
              <button type="button" className={btnSecundario} onClick={() => void tirar(a)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
        <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom ${enviando ? 'opacity-50' : ''}`}>
          {enviando ? 'Enviando...' : 'Adicionar arquivos'}
          <input type="file" multiple className="sr-only" disabled={enviando} onChange={(e) => { void adicionar(e.target.files); e.target.value = '' }} />
        </label>
        <p className="text-xs text-texto-suave">Até 50 MB por arquivo. Só você e a equipe do cliente veem os arquivos.</p>
      </section>
    </Moldura>
  )
}

interface PropsVirar {
  ideia: Ideia
  clientes: ClienteResumo[]
  onFechar: () => void
  onCriado: () => void
}

export function VirarPost({ ideia, clientes, onFechar, onCriado }: PropsVirar) {
  const [clienteId, setClienteId] = useState(ideia.cliente_id ?? clientes[0]?.id ?? '')
  const [data, setData] = useState(dataDeHoje())
  const [erro, setErro] = useState('')
  const [criadoPara, setCriadoPara] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!clienteId) return setErro('Escolha o cliente.')
    setErro('')
    setSalvando(true)
    const primeiraLinha = ideia.texto.split('\n')[0].trim()
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        cliente_id: clienteId,
        data_publicacao: data,
        status: 'ideia',
        formato: 'post_unico',
        tema: primeiraLinha.slice(0, 120),
        copy: ideia.texto.trim().length > 120 || ideia.texto.includes('\n') ? ideia.texto.trim() : null,
      })
      .select('id')
      .single()
    if (error || !post) {
      setSalvando(false)
      return setErro('Não foi possível criar o post.')
    }
    await supabase.from('ideias').update({ post_id: post.id, cliente_id: ideia.cliente_id ?? clienteId }).eq('id', ideia.id)
    setSalvando(false)
    setCriadoPara(clienteId)
    onCriado()
  }

  return (
    <Moldura titulo="Virar post" onFechar={onFechar}>
      {criadoPara ? (
        <div className="space-y-4">
          <Aviso tipo="ok">Post criado com status "Ideia".</Aviso>
          <Link to={`/app/clientes/${criadoPara}?aba=calendario`} className={btnPrimario}>
            Abrir o calendário do cliente
          </Link>
        </div>
      ) : (
        <form onSubmit={criar} className="space-y-4">
          <p className="whitespace-pre-wrap rounded-sm border border-linha bg-superficie p-3 text-sm">{ideia.texto}</p>
          <Campo rotulo="Cliente">
            <select className={inputCls} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {!ideia.cliente_id && <option value="">Escolha...</option>}
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Data prevista de publicação">
            <input type="date" required className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <p className="text-xs text-texto-suave">O texto da ideia vira o tema (e a copy, se for longo). Os arquivos continuam na ideia.</p>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <button type="submit" disabled={salvando} className={btnPrimario}>
            {salvando ? 'Criando...' : 'Criar post'}
          </button>
        </form>
      )}
    </Moldura>
  )
}
