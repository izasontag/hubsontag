import { useCallback, useEffect, useState } from 'react'
import { Aviso, btnSecundario, Cartao, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'

interface Print {
  id: string
  caminho_storage: string
  ordem: number
  url?: string
}

const TAMANHO_MAXIMO = 10 * 1024 * 1024

export default function FeedAtual({ clienteId }: { clienteId: string }) {
  const [prints, setPrints] = useState<Print[]>([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('feed_atual').select('*').eq('cliente_id', clienteId).order('ordem')
    const lista = (data as Print[]) ?? []
    if (lista.length === 0) return setPrints([])
    const { data: links } = await supabase.storage.from('posts').createSignedUrls(lista.map((p) => p.caminho_storage), 3600)
    const mapa = new Map((links ?? []).map((l) => [l.path, l.signedUrl]))
    setPrints(lista.map((p) => ({ ...p, url: mapa.get(p.caminho_storage) ?? undefined })))
  }, [clienteId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function enviar(arquivos: FileList | null) {
    if (!arquivos) return
    setErro('')
    setEnviando(true)
    let proxima = prints.reduce((max, p) => Math.max(max, p.ordem), -1) + 1
    for (const arquivo of Array.from(arquivos)) {
      if (!arquivo.type.startsWith('image/') || arquivo.size > TAMANHO_MAXIMO) {
        setErro(`"${arquivo.name}" precisa ser uma imagem de até 10 MB.`)
        continue
      }
      const extensao = (arquivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const caminho = `${clienteId}/feed/${crypto.randomUUID()}.${extensao}`
      const envio = await supabase.storage.from('posts').upload(caminho, arquivo, { contentType: arquivo.type })
      if (envio.error) {
        setErro('Não foi possível enviar um dos prints.')
        continue
      }
      const linha = await supabase.from('feed_atual').insert({ cliente_id: clienteId, caminho_storage: caminho, ordem: proxima })
      if (linha.error) {
        await supabase.storage.from('posts').remove([caminho])
        setErro('Não foi possível registrar um dos prints.')
        continue
      }
      proxima += 1
    }
    setEnviando(false)
    void carregar()
  }

  async function mover(indice: number, delta: -1 | 1) {
    const alvo = indice + delta
    if (alvo < 0 || alvo >= prints.length) return
    const nova = [...prints]
    ;[nova[indice], nova[alvo]] = [nova[alvo], nova[indice]]
    const mudou = nova.map((p, i) => ({ p, i })).filter(({ p, i }) => p.ordem !== i)
    await Promise.all(mudou.map(({ p, i }) => supabase.from('feed_atual').update({ ordem: i }).eq('id', p.id)))
    void carregar()
  }

  async function remover(p: Print) {
    if (!window.confirm('Remover este print?')) return
    await supabase.storage.from('posts').remove([p.caminho_storage])
    await supabase.from('feed_atual').delete().eq('id', p.id)
    void carregar()
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Feed atual (prints)</Titulo>
      <p className="text-sm text-texto-suave">
        Prints dos posts que já estão no Instagram do cliente, do mais recente para o mais antigo. No portal, os posts
        aprovados aparecem por cima deles na prévia do feed.
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {prints.map((p, i) => (
          <li key={p.id} className="space-y-1 rounded-sm border border-linha bg-superficie p-1">
            {p.url ? <img src={p.url} alt={`Print ${i + 1}`} className="aspect-[4/5] w-full rounded-sm object-cover" /> : <div className="aspect-[4/5] w-full bg-linha" />}
            <div className="flex gap-1">
              <button type="button" aria-label={`Mover print ${i + 1} para trás`} disabled={i === 0} onClick={() => void mover(i, -1)} className="h-11 flex-1 cursor-pointer rounded-sm border border-linha disabled:opacity-40">
                &larr;
              </button>
              <button type="button" aria-label={`Mover print ${i + 1} para frente`} disabled={i === prints.length - 1} onClick={() => void mover(i, 1)} className="h-11 flex-1 cursor-pointer rounded-sm border border-linha disabled:opacity-40">
                &rarr;
              </button>
            </div>
            <button type="button" className={`${btnSecundario} w-full`} onClick={() => void remover(p)}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom ${enviando ? 'opacity-50' : ''}`}>
        {enviando ? 'Enviando...' : 'Adicionar prints'}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={enviando} onChange={(e) => { void enviar(e.target.files); e.target.value = '' }} />
      </label>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}
