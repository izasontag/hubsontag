import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Aviso, btnPrimario, STATUS_ROTULO } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../lib/tipos'

export default function Clientes() {
  const { perfil } = useAuth()
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('clientes')
      .select('*')
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar os clientes.')
        else setClientes(data as Cliente[])
      })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-semibold text-marrom">Clientes</h1>
        {perfil?.papel === 'dona' && (
          <Link to="/app/clientes/novo" className={btnPrimario}>
            Novo cliente
          </Link>
        )}
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {clientes === null && !erro && <p className="text-texto-suave">Carregando...</p>}
      {clientes?.length === 0 && (
        <p className="text-texto-suave">Nenhum cliente cadastrado ainda.</p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clientes?.map((c) => (
          <li key={c.id}>
            <Link
              to={`/app/clientes/${c.id}`}
              className="block h-full rounded-md border border-linha bg-superficie p-5 hover:border-marrom"
              style={{ borderTop: `4px solid ${c.cor_destaque}` }}
            >
              <p className="font-titulo text-2xl font-semibold text-texto">{c.nome}</p>
              {c.instagram && <p className="text-sm text-texto-suave">{c.instagram}</p>}
              {c.nicho && <p className="text-sm text-texto-suave">{c.nicho}</p>}
              <p className="mt-3 text-xs uppercase tracking-wide text-texto-suave">
                {STATUS_ROTULO[c.status]}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
