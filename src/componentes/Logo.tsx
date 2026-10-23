// Monograma "sm": traço único e firme, com o "m" fazendo um laço (a história que se dobra e continua).
const TRACO_S = 'M58 46C58 30 22 28 22 52C22 72 58 62 58 88C58 110 20 108 20 94'
const TRACO_M = 'M80 110V34C108 34 124 52 126 76C127 98 106 104 104 86C102 64 122 34 152 34C178 34 190 54 190 110'

export function LogoMonograma({ className = '', titulo = 'Sontag', ponto = 'var(--color-azul)' }: { className?: string; titulo?: string; ponto?: string }) {
  return (
    <svg viewBox="0 0 214 130" className={className} role="img" aria-label={titulo} fill="none" strokeWidth="13" strokeLinejoin="round">
      <path d={TRACO_S} stroke="currentColor" />
      <path d={TRACO_M} stroke="currentColor" />
      <circle cx="204" cy="106" r="6.5" fill={ponto} />
    </svg>
  )
}

// Logo completa: monograma + "AG." na vertical, como nas referências (sem escrever o nome por extenso).
export function LogoCompleta({ className = '', claro = false }: { className?: string; claro?: boolean }) {
  return (
    <span className={`inline-flex items-end gap-1.5 ${claro ? 'text-superficie' : 'text-marrom-escuro'} ${className}`} aria-hidden>
      <LogoMonograma className="h-10 w-auto shrink-0" ponto="transparent" />
      <span className={`mb-1 font-titulo text-base font-bold uppercase leading-none tracking-[0.25em] ${claro ? 'text-azul-claro' : 'text-azul'} [writing-mode:vertical-rl] rotate-180`}>
        AG.
      </span>
    </span>
  )
}
