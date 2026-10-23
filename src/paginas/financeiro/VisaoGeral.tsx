import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import GraficoReceitaDespesa from '../../componentes/GraficoReceitaDespesa'
import type { PontoMes } from '../../componentes/GraficoReceitaDespesa'
import { Aviso, Cartao, formatarData, Titulo } from '../../componentes/ui'
import { dataDeHoje, limitesDoMes, somarMeses } from '../../lib/datas'
import { reais, reaisInteiro, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'

interface CobrancaMin {
  valor: number
  vencimento: string
  status: string
  pago_em: string | null
}
interface Atrasada {
  id: string
  descricao: string
  valor: number
  vencimento: string
  cliente: { nome: string } | null
  eventoId?: string
}
interface ContratoMin {
  id: string
  plano: string
  valor_mensal: number
  renovacao: string | null
  cliente: { nome: string } | null
}

const somarDias = (data: string, dias: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const n = new Date(a, m - 1, d + dias)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function VisaoGeral({ mes, onMes }: { mes: string; onMes: (m: string) => void }) {
  const [cobrancas, setCobrancas] = useState<CobrancaMin[] | null>(null)
  const [despesas, setDespesas] = useState<{ data: string; valor: number }[]>([])
  const [atrasadas, setAtrasadas] = useState<Atrasada[]>([])
  const [contratos, setContratos] = useState<ContratoMin[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    const ini = `${somarMeses(mes, -5)}-01`
    const fim = limitesDoMes(mes).fim
    const janela = `and(vencimento.gte.${ini},vencimento.lte.${fim}),and(pago_em.gte.${ini},pago_em.lte.${fim})`
    Promise.all([
      supabase.from('cobrancas').select('valor, vencimento, status, pago_em').or(janela),
      supabase.from('despesas').select('data, valor').gte('data', ini).lte('data', fim),
      supabase.from('cobrancas').select('id, descricao, valor, vencimento, cliente:clientes(nome)').eq('status', 'atrasado').order('vencimento'),
      supabase.from('contratos').select('id, plano, valor_mensal, renovacao, cliente:clientes(nome)').eq('status', 'ativo'),
      supabase.from('evento_parcelas').select('valor, vencimento, status, pago_em').or(janela),
      supabase.from('evento_parcelas').select('id, evento_id, descricao, valor, vencimento, evento:eventos(nome)').eq('status', 'atrasado').order('vencimento'),
    ]).then(([c, d, a, k, ep, ea]) => {
      if (!ativo) return
      if (c.error || d.error || a.error || k.error || ep.error || ea.error) return setErro('Não foi possível carregar o financeiro.')
      setErro('')
      // as parcelas dos eventos contam junto com as cobranças da agência
      setCobrancas([...(c.data as CobrancaMin[]), ...(ep.data as CobrancaMin[])])
      setDespesas(d.data as { data: string; valor: number }[])
      const dosEventos = (ea.data as unknown as { id: string; evento_id: string; descricao: string; valor: number; vencimento: string; evento: { nome: string } | null }[]).map(
        (x): Atrasada => ({ id: x.id, descricao: x.descricao, valor: x.valor, vencimento: x.vencimento, cliente: x.evento ? { nome: x.evento.nome } : null, eventoId: x.evento_id }),
      )
      setAtrasadas([...(a.data as unknown as Atrasada[]), ...dosEventos].sort((x, y) => x.vencimento.localeCompare(y.vencimento)))
      setContratos(k.data as unknown as ContratoMin[])
    })
    return () => {
      ativo = false
    }
  }, [mes])

  const hoje = dataDeHoje()
  const meses = [-5, -4, -3, -2, -1, 0].map((n) => somarMeses(mes, n))
  const serie: PontoMes[] = meses.map((m) => ({
    mes: m,
    receita: soma((cobrancas ?? []).filter((c) => c.status === 'pago' && c.pago_em?.startsWith(m)), (c) => Number(c.valor)),
    despesa: soma(despesas.filter((d) => d.data.startsWith(m)), (d) => Number(d.valor)),
  }))
  const atual = serie[serie.length - 1]
  const doMes = (cobrancas ?? []).filter((c) => c.vencimento.startsWith(mes))
  const prevista = soma(doMes, (c) => Number(c.valor))
  const aReceber = soma(doMes.filter((c) => c.status !== 'pago'), (c) => Number(c.valor))
  const totalAtrasado = soma(atrasadas, (a) => Number(a.valor))
  const recorrente = soma(contratos, (c) => Number(c.valor_mensal))
  const vencendo = contratos
    .filter((c) => c.renovacao && c.renovacao <= somarDias(hoje, 30))
    .sort((a, b) => (a.renovacao ?? '').localeCompare(b.renovacao ?? ''))

  const tiles: { rotulo: string; valor: number; nota?: string; alerta?: boolean }[] = [
    { rotulo: 'Previsto no mês', valor: prevista, nota: 'cobranças e parcelas de eventos com vencimento no mês' },
    { rotulo: 'Recebido no mês', valor: atual.receita },
    { rotulo: 'A receber no mês', valor: aReceber },
    { rotulo: 'Atrasado (total)', valor: totalAtrasado, alerta: totalAtrasado > 0 },
    { rotulo: 'Despesas do mês', valor: atual.despesa },
    { rotulo: 'Resultado do mês', valor: atual.receita - atual.despesa, nota: 'recebido menos despesas' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegacaoMes mes={mes} onMes={onMes} />
        <p className="text-sm text-texto-suave">
          Receita recorrente (contratos ativos): <strong className="font-medium text-texto">{reais(recorrente)}</strong> por mês
        </p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className={`transition-opacity duration-300 ${cobrancas === null ? 'opacity-50' : ''}`}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <li key={t.rotulo} className={`rounded-md border p-5 shadow-suave ${t.alerta ? 'border-marrom bg-marrom-claro' : 'border-linha bg-superficie'}`}>
              <p className="eyebrow">{t.rotulo}</p>
              <p className="numeros-grandes mt-3 text-4xl font-medium leading-none">{reaisInteiro(t.valor)}</p>
              {t.nota && <p className="mt-2 text-xs text-texto-suave">{t.nota}</p>}
            </li>
          ))}
        </ul>
      </div>

      <Cartao className="space-y-3">
        <Titulo>Recebido e despesas</Titulo>
        <GraficoReceitaDespesa dados={serie} destaque={mes} />
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao className="space-y-3">
          <Titulo>Cobranças atrasadas</Titulo>
          {atrasadas.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhuma cobrança atrasada.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {atrasadas.slice(0, 6).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {a.cliente?.nome ?? 'Sem cliente'}
                    <span className="block text-xs text-texto-suave">
                      {a.eventoId ? 'Evento · ' : ''}
                      {a.descricao} · venceu em {formatarData(a.vencimento)}
                    </span>
                  </span>
                  <strong className="font-medium tabular-nums text-marrom">{reais(Number(a.valor))}</strong>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/financeiro?aba=cobrancas" className="inline-flex min-h-11 items-center text-sm text-musgo underline underline-offset-4">
            Ver todas as cobranças
          </Link>
        </Cartao>
        <Cartao className="space-y-3">
          <Titulo>Contratos vencendo em 30 dias</Titulo>
          {vencendo.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhum contrato para renovar nos próximos 30 dias.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {vencendo.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {c.cliente?.nome ?? 'Cliente'}
                    <span className="block text-xs text-texto-suave">{c.plano}</span>
                  </span>
                  <span className={c.renovacao && c.renovacao < hoje ? 'font-medium text-marrom' : ''}>
                    {c.renovacao && formatarData(c.renovacao)}
                    {c.renovacao && c.renovacao < hoje && ' (vencido)'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/financeiro?aba=contratos" className="inline-flex min-h-11 items-center text-sm text-musgo underline underline-offset-4">
            Ver contratos
          </Link>
        </Cartao>
      </div>
    </div>
  )
}
