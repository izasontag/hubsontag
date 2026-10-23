import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import type { Perfil } from './tipos'

interface ContextoAuth {
  carregando: boolean
  sessao: Session | null
  perfil: Perfil | null
  entrar: (email: string, senha: string) => Promise<string | null>
  sair: () => Promise<void>
}

const Contexto = createContext<ContextoAuth | null>(null)

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  const carregarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null)
      return
    }
    const { data } = await supabase.from('perfis').select('*').eq('id', s.user.id).maybeSingle()
    setPerfil((data as Perfil | null) ?? null)
  }, [])

  useEffect(() => {
    let ativo = true
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!ativo) return
        setSessao(data.session)
        await carregarPerfil(data.session)
      })
      .catch(() => undefined)
      .finally(() => ativo && setCarregando(false))

    const { data: escuta } = supabase.auth.onAuthStateChange((evento, nova) => {
      if (evento === 'INITIAL_SESSION') return
      setSessao(nova)
      // adia a consulta para fora do callback, como o Supabase recomenda
      setTimeout(() => void carregarPerfil(nova), 0)
    })
    return () => {
      ativo = false
      escuta.subscription.unsubscribe()
    }
  }, [carregarPerfil])

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (!error) return null
    if (error.message.toLowerCase().includes('invalid login')) return 'E-mail ou senha incorretos.'
    return 'Não foi possível entrar agora. Tente de novo em instantes.'
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <Contexto.Provider value={{ carregando, sessao, perfil, entrar, sair }}>
      {children}
    </Contexto.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth precisa estar dentro de ProvedorAuth')
  return ctx
}
