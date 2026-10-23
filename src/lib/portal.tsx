import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import type { PortalDados, PortalPost } from './tipos'

interface ContextoPortal {
  token: string
  dados: PortalDados | null
  posts: PortalPost[]
  carregando: boolean
  invalido: boolean
  recarregar: () => Promise<void>
}

const Contexto = createContext<ContextoPortal | null>(null)

export function PortalProvider({ token, children }: { token: string; children: ReactNode }) {
  const [dados, setDados] = useState<PortalDados | null>(null)
  const [posts, setPosts] = useState<PortalPost[]>([])
  const [carregando, setCarregando] = useState(true)
  const [invalido, setInvalido] = useState(false)

  const recarregar = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.rpc('portal_dados', { p_token: token }),
      supabase.rpc('portal_posts', { p_token: token }),
    ])
    if (d.error || !d.data) {
      setInvalido(true)
    } else {
      setInvalido(false)
      setDados(d.data as PortalDados)
      setPosts((p.data as PortalPost[]) ?? [])
    }
    setCarregando(false)
  }, [token])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  return <Contexto.Provider value={{ token, dados, posts, carregando, invalido, recarregar }}>{children}</Contexto.Provider>
}

export function usePortal() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('usePortal precisa estar dentro de PortalProvider')
  return ctx
}

// As imagens ficam em um endereço longo e secreto, que só chega a quem tem o link do portal.
export const urlImagem = (caminho: string) => supabase.storage.from('posts').getPublicUrl(caminho).data.publicUrl

export function mensagemDeErro(erro: { message?: string } | null) {
  const m = erro?.message ?? ''
  if (m.includes('post_indisponivel')) return 'Este post já foi respondido ou não está mais disponível. Atualize a página.'
  if (m.includes('mensagem_obrigatoria')) return 'Escreva o que precisa ser ajustado.'
  if (m.includes('link_invalido')) return 'Este link não está mais ativo. Peça um novo link à Sontag Media.'
  if (m.includes('texto_invalido')) return 'O texto precisa ter entre 1 e 2000 caracteres.'
  return 'Não foi possível enviar agora. Tente de novo em instantes.'
}

export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
