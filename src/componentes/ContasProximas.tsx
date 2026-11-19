import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataDeHoje } from '../lib/datas'
import { reais } from '../lib/dinheiro'
import { supabase } from '../lib/supabase'
import { Cartao, formatarData, Titulo } from './ui'

interface Conta {
  id: string
  nome: string
  area: 'pessoal' | 'agencia'
  vencimento: string
  valor: number
}

// Painel (só dona): contas dos gastos fixos que já venceram ou vencem em até 7 dias.
export default function ContasProximas() {
  const [contas, setContas] = useState<Conta[] | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const hoje = dataDeHoje()
      const mes = `${hoje.slice(0, 7)}-01`
      const limite = new Date(`${hoje}T12:00:00`)
      limite.setDate(limite.getDate() + 7)
      const ate = limite.toISOString().slice(0, 10)
      // garante que as contas do mês existam (sem duplicar)
      await Promise.all([supabase.rpc('gerar_gastos_fixos', { p_area: 'pessoal', p_mes: mes }), supabase.rpc('gerar_gastos_fixos', { p_area: 'agencia', p_mes: mes })])
      const [m, g] = await Promise.all([
        supabase.from('gastos_fixos_mes').select('id, gasto_id, vencimento, valor').eq('status', 'a_pagar').lte('vencimento', ate).order('vencimento').limit(12),
        supabase.from('gastos_fixos').select('id, nome, area'),
      ])
      if (!ativo) return
      if (m.error || g.error) return setContas([])
      const nomes = new Map(((g.data as { id: string; nome: string; area: 'pessoal' | 'agencia' }[]) ?? []).map((x) => [x.id, x]))
      setContas(
        ((m.data as { id: string; gasto_id: string; vencimento: string; valor: number }[]) ?? [])
          .filter((x) => nomes.has(x.gasto_id))
          .map((x) => ({ id: x.id, nome: nomes.get(x.gasto_id)!.nome, area: nomes.get(x.gasto_id)!.area, vencimento: x.vencimento, valor: Number(x.valor) })),
      )
    }
    void carregar()
    return () => {
      ativo = false
    }
  }, [])

  if (contas === null || contas.length === 0) return null
  const hoje = dataDeHoje()
  const total = contas.reduce((t, c) => t + c.valor, 0)

  return (
    <Cartao className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <Titulo>Contas a pagar</Titulo>
        <span className="numeros-grandes text-xl">{reais(total)}</span>
      </div>
      <ul className="divide-y divide-linha">
        {contas.map((c) => {
          const atrasada = c.vencimento < hoje
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link to={c.area === 'pessoal' ? '/app/financeiro/pessoal' : '/app/financeiro?aba=gastos'} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate">{c.nome}</span>
                <span className={`text-xs ${atrasada ? 'font-medium text-red-800' : 'text-texto-suave'}`}>
                  {c.area === 'pessoal' ? 'Pessoal' : 'Agência'} · {atrasada ? 'venceu' : 'vence'} {formatarData(c.vencimento).slice(0, 5)}
                </span>
              </Link>
              <span className="tabular-nums">{reais(c.valor)}</span>
            </li>
          )
        })}
      </ul>
    </Cartao>
  )
}
