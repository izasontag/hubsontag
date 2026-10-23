import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Aviso, btnPrimario, Campo, inputCls } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { supabaseConfigurado } from '../lib/supabase'

export default function Entrar() {
  const { sessao, carregando, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!carregando && sessao) return <Navigate to="/app" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const resultado = await entrar(email.trim(), senha)
    if (resultado) setErro(resultado)
    setEnviando(false)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <form onSubmit={enviar} className="space-y-4 rounded-md border border-linha bg-superficie p-6 sm:p-8">
        <h1 className="font-titulo text-4xl font-semibold text-marrom">Hub Sontag Media</h1>
        <p className="text-texto-suave">Entre para acessar a área interna.</p>
        {!supabaseConfigurado && (
          <Aviso tipo="erro">A conexão com o Supabase não está configurada.</Aviso>
        )}
        <Campo rotulo="E-mail">
          <input
            type="email"
            required
            autoComplete="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>
        <Campo rotulo="Senha">
          <input
            type="password"
            required
            autoComplete="current-password"
            className={inputCls}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Campo>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={enviando} className={`${btnPrimario} w-full`}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
