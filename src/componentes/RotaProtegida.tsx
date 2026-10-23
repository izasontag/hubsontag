import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { btnSecundario } from './ui'

export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { carregando, sessao, perfil, sair } = useAuth()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="anim-respirar font-titulo text-3xl text-marrom" role="status">
          Sontag <em>Media</em>
        </p>
      </div>
    )
  }
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
