import { useState } from 'react'
import { nomeDoMes } from '../lib/datas'
import { reais, reaisCompacto } from '../lib/dinheiro'

export interface PontoMes {
  mes: string // AAAA-MM
  receita: number
  despesa: number
}

// Cores validadas para daltonismo (verde-musgo vivo e âmbar). Veja o CLAUDE.md.
const COR_RECEITA = '#5b7a38'
const COR_DESPESA = '#c98b4f'

const L = 640
const A = 250
const MARGEM = { topo: 14, direita: 8, base: 30, esquerda: 52 }
const BARRA = 22
const VAO = 2

// Barra com o topo arredondado (4px) e a base reta, colada na linha de base.
function barra(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

function tetoLimpo(maximo: number) {
  if (maximo <= 0) return 1000
  const potencia = Math.pow(10, Math.floor(Math.log10(maximo)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * potencia >= maximo) return m * potencia
  return 10 * potencia
}

const mesCurto = (mes: string) => nomeDoMes(mes).split(' ')[0].slice(0, 3).toLowerCase()

export default function GraficoReceitaDespesa({ dados, destaque }: { dados: PontoMes[]; destaque: string }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [tabela, setTabela] = useState(false)

  const teto = tetoLimpo(Math.max(0, ...dados.flatMap((d) => [d.receita, d.despesa])))
  const larguraUtil = L - MARGEM.esquerda - MARGEM.direita
  const alturaUtil = A - MARGEM.topo - MARGEM.base
  const grupo = larguraUtil / Math.max(1, dados.length)
  const y = (v: number) => MARGEM.topo + alturaUtil * (1 - v / teto)
  const base = MARGEM.topo + alturaUtil
  const ticks = [0, teto / 2, teto]
  const atual = dados.find((d) => d.mes === destaque)
  const dica = ativo === null ? null : dados[ativo]

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-4 text-sm text-texto-suave">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_RECEITA }} />
            Recebido
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_DESPESA }} />
            Despesas
          </span>
        </span>
        <button type="button" onClick={() => setTabela(!tabela)} aria-pressed={tabela} className="min-h-11 cursor-pointer px-2 text-sm text-musgo underline underline-offset-4">
          {tabela ? 'Ver gráfico' : 'Ver em tabela'}
        </button>
      </figcaption>

      {atual && (
        <p className="text-sm text-texto-suave">
          {nomeDoMes(destaque)}: recebido <strong className="font-medium text-texto">{reais(atual.receita)}</strong> · despesas{' '}
          <strong className="font-medium text-texto">{reais(atual.despesa)}</strong>
        </p>
      )}

      {tabela ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Recebido e despesas por mês</caption>
            <thead>
              <tr className="border-b border-linha text-left text-texto-suave">
                <th className="py-2 pr-4 font-normal">Mês</th>
                <th className="py-2 pr-4 text-right font-normal">Recebido</th>
                <th className="py-2 pr-4 text-right font-normal">Despesas</th>
                <th className="py-2 text-right font-normal">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.mes} className="border-b border-linha/60">
                  <td className="py-2 pr-4">{nomeDoMes(d.mes)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{reais(d.receita)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{reais(d.despesa)}</td>
                  <td className="py-2 text-right tabular-nums">{reais(d.receita - d.despesa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Gráfico de colunas: recebido e despesas dos últimos meses. Use a visão em tabela para ler todos os valores.">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={MARGEM.esquerda} x2={L - MARGEM.direita} y1={y(t)} y2={y(t)} stroke="#d9d4cc" strokeWidth="1" />
                <text x={MARGEM.esquerda - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5e5953">
                  {reaisCompacto(t)}
                </text>
              </g>
            ))}
            {dados.map((d, i) => {
              const x0 = MARGEM.esquerda + i * grupo
              const centro = x0 + grupo / 2
              const xr = centro - VAO / 2 - BARRA
              const xd = centro + VAO / 2
              const hr = base - y(d.receita)
              const hd = base - y(d.despesa)
              return (
                <g key={d.mes}>
                  {(d.mes === destaque || ativo === i) && <rect x={x0 + 4} y={MARGEM.topo} width={grupo - 8} height={alturaUtil} fill="#e3dfd8" opacity={ativo === i ? 0.9 : 0.55} rx="2" />}
                  {hr > 0 && <path d={barra(xr, y(d.receita), BARRA, hr)} fill={COR_RECEITA} />}
                  {hd > 0 && <path d={barra(xd, y(d.despesa), BARRA, hd)} fill={COR_DESPESA} />}
                  <text x={centro} y={A - 9} textAnchor="middle" fontSize="12" fill={d.mes === destaque ? '#2b2724' : '#5e5953'} fontWeight={d.mes === destaque ? 600 : 400}>
                    {mesCurto(d.mes)}
                  </text>
                  <rect
                    x={x0}
                    y={MARGEM.topo}
                    width={grupo}
                    height={alturaUtil + MARGEM.base}
                    fill="transparent"
                    tabIndex={0}
                    role="group"
                    aria-label={`${nomeDoMes(d.mes)}: recebido ${reais(d.receita)}, despesas ${reais(d.despesa)}`}
                    onPointerEnter={() => setAtivo(i)}
                    onPointerLeave={() => setAtivo(null)}
                    onFocus={() => setAtivo(i)}
                    onBlur={() => setAtivo(null)}
                    className="cursor-default outline-none focus-visible:stroke-musgo"
                    strokeWidth={2}
                  />
                </g>
              )
            })}
            <line x1={MARGEM.esquerda} x2={L - MARGEM.direita} y1={base} y2={base} stroke="#c9c3ba" strokeWidth="1" />
          </svg>
          {dica && ativo !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-sm border border-linha bg-superficie p-3 text-sm shadow-elevada"
              style={{ left: `${Math.min(70, Math.max(2, ((MARGEM.esquerda + ativo * grupo) / L) * 100))}%` }}
            >
              <p className="mb-1 text-texto-suave">{nomeDoMes(dica.mes)}</p>
              <p className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-texto-suave">
                  <span aria-hidden className="h-0.5 w-3" style={{ background: COR_RECEITA }} />
                  Recebido
                </span>
                <strong className="font-semibold tabular-nums">{reais(dica.receita)}</strong>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-texto-suave">
                  <span aria-hidden className="h-0.5 w-3" style={{ background: COR_DESPESA }} />
                  Despesas
                </span>
                <strong className="font-semibold tabular-nums">{reais(dica.despesa)}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
