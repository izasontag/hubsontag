import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { btnSecundario } from './ui'

export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { carregando, sessao, perfil, sair } = useAuth()

  if (carregando) return <p className="p-8 text-texto-suave">Carregando...</p>
  if (!sessao) return <Navigate to="/entrar" replace />
  if (!perfil) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="mb-4">
          Sua conta entrou, mas ainda não tem permissão de acesso. Avise a Izadora para liberar.
        </p>
        <button className={btnSecundario} onClick={() => void sair()}>
          Sair
        </button>
      </main>
    )
  }
  return <>{children}</>
}
