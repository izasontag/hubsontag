import type { CSSProperties } from 'react'

const ANO = String(new Date().getFullYear()).slice(2)

// Carimbo de correio com as iniciais, na linha dos selos das referências.
export function Carimbo({ iniciais = 'SM', ano, className = '' }: { iniciais?: string; ano?: string; className?: string }) {
  const marca = ano ?? ANO
  return (
    <svg viewBox="0 0 120 140" className={className} fill="none" stroke="currentColor" aria-hidden>
      <rect x="9" y="9" width="102" height="122" rx="5" strokeWidth="5" strokeDasharray="0 9" strokeLinecap="round" />
      <rect x="20" y="20" width="80" height="100" rx="2" strokeWidth="1.2" />
      <text x="60" y="72" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="40" fontWeight="600" fill="currentColor" stroke="none">
        {iniciais}
      </text>
      <path d="M38 84h44" strokeWidth="1" />
      <text x="60" y="108" textAnchor="middle" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize="12" letterSpacing="3" fill="currentColor" stroke="none">
        {marca}
      </text>
    </svg>
  )
}

function Estrela() {
  return (
    <svg viewBox="0 0 24 24" className="mx-5 inline-block h-3 w-3 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z" />
    </svg>
  )
}

// Faixa de texto que rola devagar (decorativa; parada para quem prefere menos movimento).
export function Ticker({ itens, className = '' }: { itens: string[]; className?: string }) {
  const bloco = Array.from({ length: 4 }).flatMap(() => itens)
  return (
    <div aria-hidden className={`ticker uppercase ${className}`}>
      <div className="ticker-trilho">
        {[0, 1].map((k) => (
          <span key={k} className="flex shrink-0 items-center">
            {bloco.map((t, i) => (
              <span key={i} className="flex items-center">
                {t}
                <Estrela />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}

export const giro = (n: number): CSSProperties => ({ '--giro': `${[-1.2, 0.9, -0.6, 1.1, -0.9, 0.7][n % 6]}deg` }) as CSSProperties
