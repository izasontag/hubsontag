import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import Aneis from '../componentes/Aneis'
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-marrom p-8 text-superficie sm:p-12">
        <Aneis className="absolute -right-24 -top-24 h-[34rem] w-[34rem] text-superficie opacity-20" />
        <p className="eyebrow anim-entrar relative !text-superficie/80">Storymaker · Marketing</p>
        <div className="relative">
          <h1 className="anim-entrar font-titulo text-6xl font-medium leading-[0.95] sm:text-7xl lg:text-8xl" style={{ '--i': 1 } as React.CSSProperties}>
            Sontag
            <br />
            <em className="font-normal">Media</em>
          </h1>
          <p className="anim-entrar mt-5 max-w-sm text-lg text-superficie/85" style={{ '--i': 3 } as React.CSSProperties}>
            Cada cliente, cada história, com cuidado em cada detalhe.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={enviar} className="anim-entrar w-full max-w-sm space-y-5" style={{ '--i': 2 } as React.CSSProperties}>
          <div>
            <p className="eyebrow mb-2">Área interna</p>
            <h2 className="titulo-secao">Entrar</h2>
          </div>
          {!supabaseConfigurado && <Aviso tipo="erro">A conexão com o Supabase não está configurada.</Aviso>}
          <Campo rotulo="E-mail">
            <input type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Senha">
            <input type="password" required autoComplete="current-password" className={inputCls} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Campo>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <button type="submit" disabled={enviando} className={`${btnPrimario} w-full`}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
