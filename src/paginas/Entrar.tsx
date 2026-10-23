import { LogoCompleta } from '../componentes/Logo'
import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Carimbo, Ticker } from '../componentes/Decor'
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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="festao-direita relative z-10 flex min-h-72 min-w-0 flex-col justify-between overflow-visible bg-azul p-8 text-superficie sm:p-12" style={{ '--festao': 'var(--color-azul)' } as CSSProperties}>
        <p className="eyebrow anim-entrar !text-superficie/90">Agência de conteúdo · cobertura de stories</p>
        <div className="relative flex items-center gap-8">
          <div>
            <h1 className="anim-entrar" style={{ '--i': 1 } as CSSProperties}>
              <span className="sr-only">Sontag Media</span>
              <LogoCompleta claro className="[&_svg]:h-24 sm:[&_svg]:h-32 [&_span]:text-lg sm:[&_span]:text-xl" />
            </h1>
            <p className="anim-entrar mt-5 font-titulo text-2xl font-medium italic text-superficie" style={{ '--i': 3 } as CSSProperties}>
              Para que todos vejam e saibam.
            </p>
            <p className="eyebrow anim-entrar mt-3 !text-superficie/80" style={{ '--i': 4 } as CSSProperties}>
              Storymaker &amp; Marketing
            </p>
          </div>
          <Carimbo className="anim-entrar hidden h-32 w-auto shrink-0 -rotate-6 text-azul-claro sm:block" />
        </div>
        <Ticker itens={['Agência de conteúdo', 'Cobertura de stories', 'Storymaker & Marketing', 'Campo Grande, MS']} className="-mx-8 border-y border-superficie/30 py-2 text-xs tracking-[0.25em] text-superficie/90 sm:-mx-12" />
      </section>
      <section className="listras flex items-center justify-center px-6 py-14">
        <form onSubmit={enviar} className="bilhete nota-papel anim-entrar w-full max-w-sm space-y-5 p-8" style={{ '--i': 2 } as CSSProperties}>
          <div>
            <p className="eyebrow mb-1">Bem-vinda de volta</p>
            <h2 className="titulo-secao">
              Entrar <em>aqui</em>
            </h2>
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
