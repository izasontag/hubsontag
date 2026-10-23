// Monograma "sm": traço único e firme, com o "m" fazendo um laço (a história que se dobra e continua).
const TRACO_S = 'M58 46C58 30 22 28 22 52C22 72 58 62 58 88C58 110 20 108 20 94'
const TRACO_M = 'M80 110V34C108 34 124 52 126 76C127 98 106 104 104 86C102 64 122 34 152 34C178 34 190 54 190 110'

export function LogoMonograma({ className = '', titulo = 'Sontag Media', ponto = 'var(--color-azul)' }: { className?: string; titulo?: string; ponto?: string }) {
  return (
    <svg viewBox="0 0 214 130" className={className} role="img" aria-label={titulo} fill="none" strokeWidth="13" strokeLinejoin="round">
      <path d={TRACO_S} stroke="currentColor" />
      <path d={TRACO_M} stroke="currentColor" />
      <circle cx="204" cy="106" r="6.5" fill={ponto} />
    </svg>
  )
}

// Logo completa: monograma + nome em caixa alta espaçada, sóbria.
export function LogoCompleta({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 text-marrom-escuro ${className}`}>
      <LogoMonograma className="h-9 w-auto shrink-0" />
      <span className="border-l border-marrom-escuro/30 pl-3">
        <span className="block font-titulo text-[1.05rem] font-semibold uppercase leading-none tracking-[0.28em]">Sontag</span>
        <span className="mt-1 block text-[0.58rem] uppercase leading-none tracking-[0.42em] text-azul-escuro">Media</span>
      </span>
    </span>
  )
}
