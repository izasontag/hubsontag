import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase'

type Estado = 'verificando' | 'ok' | 'nao_configurada' | 'erro'

const textos: Record<Estado, string> = {
  verificando: 'verificando...',
  ok: 'ok',
  nao_configurada: 'não configurada',
  erro: 'erro ao conectar',
}

export default function Inicio() {
  const [estado, setEstado] = useState<Estado>(
    supabaseConfigurado ? 'verificando' : 'nao_configurada',
  )

  useEffect(() => {
    if (!supabase) return
    supabase.auth
      .getSession()
      .then(({ error }) => setEstado(error ? 'erro' : 'ok'))
      .catch(() => setEstado('erro'))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <div className="rounded-md border border-linha bg-superficie p-8">
        <h1 className="font-titulo text-4xl font-semibold text-marrom">Hub Sontag Media</h1>
        <p className="mt-3 text-texto-suave">
          Preparação concluída. Esta é a página inicial de teste.
        </p>
        <p className="mt-6 border-t border-linha pt-4 text-sm">
          Conexão com o Supabase:{' '}
          <strong className={estado === 'ok' ? 'text-musgo' : 'text-marrom'}>
            {textos[estado]}
          </strong>
        </p>
      </div>
    </main>
  )
}
