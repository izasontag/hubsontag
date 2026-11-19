import { useEffect, useState } from 'react'
import { dataDeHoje } from './datas'
import { supabase } from './supabase'

export interface Contadores {
  ajustes: number // posts em que o cliente pediu ajuste
  tarefas: number // tarefas atrasadas
  financeiro: number // cobranças e gastos fixos atrasados (só dona)
}

const zero: Contadores = { ajustes: 0, tarefas: 0, financeiro: 0 }

// Números pequenos no menu (o que precisa de atenção). Atualiza ao trocar de tela, ao voltar para a aba e a cada 90 s.
export function useContadores(dona: boolean, gatilho: string) {
  const [c, setC] = useState<Contadores>(zero)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const hoje = dataDeHoje()
      const [a, t, co, gf, ca] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'ajuste_pedido'),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).neq('status', 'feito').lt('data', hoje),
        dona ? supabase.from('cobrancas').select('id', { count: 'exact', head: true }).neq('status', 'pago').lt('vencimento', hoje) : Promise.resolve({ count: 0 }),
        dona ? supabase.from('gastos_fixos_mes').select('id', { count: 'exact', head: true }).eq('status', 'a_pagar').lt('vencimento', hoje) : Promise.resolve({ count: 0 }),
        supabase.from('calendarios_mensais').select('id', { count: 'exact', head: true }).eq('status', 'ajuste_pedido'),
      ])
      if (ativo) setC({ ajustes: (a.count ?? 0) + (ca.count ?? 0), tarefas: t.count ?? 0, financeiro: (co.count ?? 0) + (gf.count ?? 0) })
    }
    void carregar()
    const timer = window.setInterval(() => void carregar(), 90000)
    const aoVoltar = () => document.visibilityState === 'visible' && void carregar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      ativo = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [dona, gatilho])

  return c
}
