import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cartao } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Painel() {
  const { perfil } = useAuth()
  const [ativos, setAtivos] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativo')
      .then(({ count }) => setAtivos(count ?? 0))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-4xl font-semibold text-marrom">Olá, {perfil?.nome}</h1>
      <Cartao>
        <p className="text-texto-suave">Clientes ativos</p>
        <p className="font-titulo text-5xl text-marrom">{ativos ?? '...'}</p>
        <Link to="/app/clientes" className="mt-3 inline-block min-h-11 py-2 text-musgo underline">
          Ver clientes
        </Link>
      </Cartao>
      <p className="text-sm text-texto-suave">
        Posts da semana, aprovações e cobranças aparecem aqui nas próximas fases.
      </p>
    </div>
  )
}
