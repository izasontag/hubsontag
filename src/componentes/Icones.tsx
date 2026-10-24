import type { ReactNode } from 'react'

// Ícones de linha fina, no mesmo traço do resto do site.
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Icone({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      {children}
    </svg>
  )
}

export const IconePainel = () => (
  <Icone>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Icone>
)
export const IconeClientes = () => (
  <Icone>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16 14.2c3 0 5 2.2 5 5.3" />
  </Icone>
)
export const IconeCalendario = () => (
  <Icone>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icone>
)
export const IconeEventos = () => (
  <Icone>
    <circle cx="9" cy="14.5" r="5" />
    <circle cx="15" cy="14.5" r="5" />
    <path d="M12 3.5l1.2 2.1L12 7.7l-1.2-2.1z" />
  </Icone>
)
export const IconeIdeias = () => (
  <Icone>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
  </Icone>
)
export const IconeTarefas = () => (
  <Icone>
    <path d="M4 6.5L5.5 8l3-3M4 12.5L5.5 14l3-3M4 18.5L5.5 20l3-3M12 7h8M12 13h8M12 19h8" />
  </Icone>
)
export const IconeFinanceiro = () => (
  <Icone>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M16 14.5h2" />
  </Icone>
)
export const IconeEquipe = () => (
  <Icone>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16.5" cy="9" r="2.5" />
    <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 14.3c3 0 6 1.5 6 4.7" />
  </Icone>
)
export const IconeMenu = () => (
  <Icone className="h-6 w-6">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icone>
)
export const IconeFechar = () => (
  <Icone className="h-6 w-6">
    <path d="M6 6l12 12M18 6L6 18" />
  </Icone>
)
export const IconePrecificacao = () => (
  <Icone>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8.5 7.5h7M8.5 12h1.5M12 12h1.5M15.5 12H16M8.5 16h1.5M12 16h1.5M15.5 16H16" />
  </Icone>
)
