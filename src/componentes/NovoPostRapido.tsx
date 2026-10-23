import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { dataDeHoje } from '../lib/datas'
import { enviarCapa, enviarMidia, linkValido, tipoDoArquivo, validarArquivo } from '../lib/midias'
import { supabase } from '../lib/supabase'
import { FORMATO_ROTULO, FORMATOS } from '../lib/tipos'
import type { Cliente, FormatoPost, Rodada } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, inputCls } from './ui'

interface Item {
  id: string
  arquivo?: File
  link?: string
  previa?: string
  capa?: File
  capaPrevia?: string
}

interface Props {
  cliente: Pick<Cliente, 'id' | 'nome'>
  rodada: Rodada
  onFechar: () => void
  onCriado: () => void
}

export default function NovoPostRapido({ cliente, rodada, onFechar, onCriado }: Props) {
  const [formato, setFormato] = useState<FormatoPost>('carrossel')
  const [formatoMexido, setFormatoMexido] = useState(false)
  const [data, setData] = useState(rodada.inicio ?? dataDeHoje())
  const [horario, setHorario] = useState('')
  const [tema, setTema] = useState('')
  const [legenda, setLegenda] = useState('')
  const [itens, setItens] = useState<Item[]>([])
  const [linkVideo, setLinkVideo] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [progresso, setProgresso] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const previas = useRef<string[]>([])

  useEffect(() => {
    const aoApertar = (e: KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    document.addEventListener('keydown', aoApertar)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const urls = previas.current
    return () => {
      document.removeEventListener('keydown', aoApertar)
      document.body.style.overflow = anterior
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [onFechar, salvando])

  function adicionarArquivos(lista: FileList | File[]) {
    const novos: Item[] = []
    const problemas: string[] = []
    for (const arquivo of Array.from(lista)) {
      const problema = validarArquivo(arquivo)
      if (problema) {
        problemas.push(problema)
        continue
      }
      const previa = URL.createObjectURL(arquivo)
      previas.current.push(previa)
      novos.push({ id: crypto.randomUUID(), arquivo, previa })
    }
    setErros(problemas)
    if (novos.length === 0) return
    const todos = [...itens, ...novos]
    setItens(todos)
    // um vídeo sozinho é um reels, a não ser que você já tenha escolhido o formato
    const soUmVideo = todos.length === 1 && tipoDoArquivo(todos[0].arquivo!) === 'video'
    if (soUmVideo && !formatoMexido) setFormato('reels')
  }

  function adicionarLink() {
    if (!linkValido(linkVideo)) return setErros(['O link do vídeo precisa começar com http:// ou https://'])
    setErros([])
    setItens([...itens, { id: crypto.randomUUID(), link: linkVideo.trim() }])
    setLinkVideo('')
  }

  function definirCapa(id: string, arquivo: File | undefined) {
    if (!arquivo) return
    if (tipoDoArquivo(arquivo) !== 'imagem') return setErros([`A capa "${arquivo.name}" precisa ser uma imagem.`])
    const capaPrevia = URL.createObjectURL(arquivo)
    previas.current.push(capaPrevia)
    setErros([])
    setItens((atual) => atual.map((it) => (it.id === id ? { ...it, capa: arquivo, capaPrevia } : it)))
  }

  const mover = (i: number, delta: -1 | 1) => {
    const alvo = i + delta
    if (alvo < 0 || alvo >= itens.length) return
    const nova = [...itens]
    ;[nova[i], nova[alvo]] = [nova[alvo], nova[i]]
    setItens(nova)
  }

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErros([])
    setSalvando(true)
    setProgresso('Criando o post...')
    const { data: criado, error } = await supabase
      .from('posts')
      .insert({
        cliente_id: cliente.id,
        rodada_id: rodada.id,
        data_publicacao: data,
        horario: horario || null,
        formato,
        tema: tema.trim() || null,
        legenda: legenda.trim() || null,
        status: 'design',
      })
      .select('id')
      .single()
    if (error || !criado) {
      setSalvando(false)
      setProgresso('')
      return setErros(['Não foi possível criar o post. Confira os campos.'])
    }

    const falhas: string[] = []
    for (let i = 0; i < itens.length; i += 1) {
      const item = itens[i]
      setProgresso(`Enviando ${i + 1} de ${itens.length}...`)
      let capa: string | null = null
      if (item.capa) {
        const r = await enviarCapa(cliente.id, criado.id as string, item.capa)
        if (r.caminho) capa = r.caminho
        else if (r.erro) falhas.push(r.erro)
      }
      if (item.arquivo) {
        const problema = await enviarMidia(cliente.id, criado.id as string, item.arquivo, i, capa)
        if (problema) falhas.push(problema)
      } else if (item.link) {
        const { error: erroLink } = await supabase
          .from('post_midias')
          .insert({ post_id: criado.id, tipo: 'video', link_externo: item.link, ordem: i, capa_storage: capa })
        if (erroLink) falhas.push('Não foi possível salvar o link do vídeo.')
      }
    }
    setSalvando(false)
    setProgresso('')
    onCriado()
    if (falhas.length === 0) return onFechar()
    setErros([...falhas, 'O post foi criado. Abra "Editar post" para enviar o que faltou.'])
    setConcluido(true)
  }

  return (
    <div className="modal-fundo fixed inset-0 z-50 overflow-y-auto bg-texto/50 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Novo post na rodada">
      <div className="modal-painel mx-auto min-h-full max-w-2xl bg-fundo p-4 sm:my-6 sm:min-h-0 sm:rounded-md sm:border sm:border-linha sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="titulo-secao">Novo post</h2>
            <p className="text-sm text-texto-suave">
              {cliente.nome} · {rodada.titulo}
            </p>
          </div>
          <button type="button" className={btnSecundario} onClick={onFechar} disabled={salvando}>
            {concluido ? 'Fechar' : 'Cancelar'}
          </button>
        </div>

        <form onSubmit={criar} className="space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastando(false)
              adicionarArquivos(e.dataTransfer.files)
            }}
            className={`space-y-3 rounded-md border-2 border-dashed p-4 text-center ${arrastando ? 'border-marrom bg-superficie' : 'border-linha'}`}
          >
            <p className="text-sm text-texto-suave">Arraste aqui as imagens do carrossel ou o vídeo, ou escolha os arquivos.</p>
            <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom`}>
              Escolher arquivos
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) adicionarArquivos(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <p className="text-xs text-texto-suave">Imagens até 10 MB, vídeos até 50 MB.</p>
          </div>

          {itens.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {itens.map((it, i) => (
                <li key={it.id} className="space-y-2 rounded-sm border border-linha bg-superficie p-2">
                  {it.arquivo && it.previa && tipoDoArquivo(it.arquivo) === 'video' && (
                    <video src={it.previa} muted playsInline preload="metadata" className="aspect-square w-full rounded-sm bg-texto object-cover" aria-label={`Vídeo ${i + 1}`} />
                  )}
                  {it.arquivo && it.previa && tipoDoArquivo(it.arquivo) === 'imagem' && (
                    <img src={it.previa} alt={`Arte ${i + 1}`} className="aspect-square w-full rounded-sm object-cover" />
                  )}
                  {it.link && (
                    <div className="flex aspect-square w-full items-center justify-center rounded-sm bg-fundo p-2 text-center text-xs text-texto-suave">
                      Vídeo por link
                    </div>
                  )}
                  {(it.link || (it.arquivo && tipoDoArquivo(it.arquivo) === 'video')) && (
                    <div className="space-y-1">
                      {it.capaPrevia && <img src={it.capaPrevia} alt={`Capa do vídeo ${i + 1}`} className="h-16 w-full rounded-sm object-cover" />}
                      <label className={`${btnSecundario} w-full focus-within:ring-2 focus-within:ring-marrom`}>
                        {it.capa ? 'Trocar capa' : 'Adicionar capa'}
                        <input type="file" accept="image/*" className="sr-only" disabled={salvando} onChange={(e) => { definirCapa(it.id, e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-texto-suave">{i + 1}</span>
                    <span className="flex gap-1">
                      <button type="button" aria-label={`Mover item ${i + 1} para trás`} disabled={i === 0 || salvando} onClick={() => mover(i, -1)} className="h-11 w-11 cursor-pointer rounded-sm border border-linha disabled:opacity-40">
                        &larr;
                      </button>
                      <button type="button" aria-label={`Mover item ${i + 1} para frente`} disabled={i === itens.length - 1 || salvando} onClick={() => mover(i, 1)} className="h-11 w-11 cursor-pointer rounded-sm border border-linha disabled:opacity-40">
                        &rarr;
                      </button>
                    </span>
                  </div>
                  <button type="button" className={`${btnSecundario} w-full`} disabled={salvando} onClick={() => setItens(itens.filter((x) => x.id !== it.id))}>
                    Tirar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <Campo rotulo="Vídeo grande? Cole o link (Drive, YouTube não listado...)">
                <input className={inputCls} placeholder="https://..." value={linkVideo} onChange={(e) => setLinkVideo(e.target.value)} />
              </Campo>
            </div>
            <button type="button" className={btnSecundario} onClick={adicionarLink}>
              Adicionar link
            </button>
          </div>

          <Campo rotulo="Título do post (opcional)">
            <input className={inputCls} value={tema} onChange={(e) => setTema(e.target.value)} />
          </Campo>
          <Campo rotulo="Legenda">
            <textarea rows={7} className={inputCls} value={legenda} onChange={(e) => setLegenda(e.target.value)} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Formato">
              <select
                className={inputCls}
                value={formato}
                onChange={(e) => {
                  setFormato(e.target.value as FormatoPost)
                  setFormatoMexido(true)
                }}
              >
                {FORMATOS.map((f) => (
                  <option key={f} value={f}>
                    {FORMATO_ROTULO[f]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Data de publicação">
              <input type="date" required className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo rotulo="Horário (opcional)">
              <input type="time" className={inputCls} value={horario} onChange={(e) => setHorario(e.target.value)} />
            </Campo>
          </div>

          {erros.length > 0 && (
            <div className="space-y-2">
              {erros.map((m) => (
                <Aviso key={m} tipo="erro">
                  {m}
                </Aviso>
              ))}
            </div>
          )}
          {progresso && <Aviso tipo="ok">{progresso}</Aviso>}
          {!concluido && (
            <button type="submit" disabled={salvando} className={btnPrimario}>
              {salvando ? 'Enviando...' : 'Adicionar à rodada'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
