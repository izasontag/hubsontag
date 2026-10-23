import { useCallback, useEffect, useState } from 'react'
import { limitesDoMes } from './datas'
import { supabase } from './supabase'
import type { ClienteResumo, PostCompleto, Tag } from './tipos'

// Carrega os posts de um mês (de um cliente ou de todos), as tags e as miniaturas.
export function useCalendario(mes: string, clienteId?: string) {
  const [posts, setPosts] = useState<PostCompleto[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { inicio, fim } = limitesDoMes(mes)
      let consulta = supabase
        .from('posts')
        .select('*, cliente:clientes(nome, cor_destaque), post_tags(tag_id), post_midias(id, post_id, caminho_storage, ordem)')
        .gte('data_publicacao', inicio)
        .lte('data_publicacao', fim)
        .order('data_publicacao')
        .order('horario', { nullsFirst: true })
      if (clienteId) consulta = consulta.eq('cliente_id', clienteId)

      const [resPosts, resTags, resClientes] = await Promise.all([
        consulta,
        supabase.from('tags').select('*').order('nome'),
        supabase.from('clientes').select('id, nome, cor_destaque').neq('status', 'encerrado').order('nome'),
      ])
      if (!ativo) return
      if (resPosts.error || resTags.error) {
        setErro('Não foi possível carregar o calendário.')
        setCarregando(false)
        return
      }
      const lista = (resPosts.data as PostCompleto[]).map((p) => ({
        ...p,
        post_midias: [...p.post_midias].sort((a, b) => a.ordem - b.ordem),
      }))
      setErro('')
      setPosts(lista)
      setTags(resTags.data as Tag[])
      setClientes((resClientes.data as ClienteResumo[]) ?? [])
      setCarregando(false)

      // miniatura = primeira arte de cada post (link temporário do armazenamento)
      const caminhos = lista.map((p) => p.post_midias[0]?.caminho_storage).filter((c): c is string => Boolean(c))
      if (caminhos.length === 0) return setMiniaturas({})
      const { data } = await supabase.storage.from('posts').createSignedUrls(caminhos, 3600)
      if (!ativo) return
      const mapa: Record<string, string> = {}
      for (const item of data ?? []) if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl
      setMiniaturas(mapa)
    }
    setCarregando(true)
    void carregar()
    return () => {
      ativo = false
    }
  }, [mes, clienteId, versao])

  return { posts, tags, clientes, miniaturas, carregando, erro, recarregar }
}
