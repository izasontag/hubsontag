import type { ReactNode } from 'react'

export const inputCls =
  'min-h-11 w-full rounded-sm border border-linha bg-superficie px-3 py-2 text-texto placeholder:text-texto-suave focus:border-marrom focus:outline-none focus:ring-1 focus:ring-marrom'

export const btnPrimario =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm bg-marrom px-5 text-sm font-medium text-superficie hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const btnSecundario =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-linha bg-superficie px-5 text-sm text-texto hover:border-marrom disabled:cursor-not-allowed disabled:opacity-50'

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-texto-suave">{rotulo}</span>
      {children}
    </label>
  )
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-linha bg-superficie p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  )
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="font-titulo text-2xl font-semibold text-marrom">{children}</h2>
}

export function Aviso({ tipo, children }: { tipo: 'erro' | 'ok'; children: ReactNode }) {
  const cor = tipo === 'erro' ? 'border-marrom text-marrom' : 'border-musgo text-musgo'
  return (
    <p role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-sm border px-3 py-2 text-sm ${cor}`}>
      {children}
    </p>
  )
}

export const STATUS_ROTULO = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  encerrado: 'Encerrado',
} as const

export function formatarData(iso: string | null) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
