import type { ReactNode } from 'react'

export const inputCls =
  'min-h-11 w-full rounded-sm border border-linha bg-superficie px-3 py-2 text-texto transition-[border-color,box-shadow] duration-200 placeholder:text-texto-suave hover:border-texto-suave focus:border-marrom focus:outline-none focus:ring-2 focus:ring-marrom/25'

export const btnPrimario =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm bg-marrom px-5 text-sm font-medium tracking-wide text-superficie shadow-suave transition duration-200 hover:-translate-y-px hover:shadow-elevada active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'

export const btnSecundario =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-linha bg-superficie px-5 text-sm text-texto transition duration-200 hover:-translate-y-px hover:border-marrom hover:shadow-suave active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'

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
    <section className={`rounded-md border border-linha bg-superficie p-5 shadow-suave sm:p-6 ${className}`}>
      {children}
    </section>
  )
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="titulo-sub">{children}</h2>
}

export function Aviso({ tipo, children }: { tipo: 'erro' | 'ok'; children: ReactNode }) {
  const cor = tipo === 'erro' ? 'border-marrom text-marrom' : 'border-musgo text-musgo'
  return (
    <p role={tipo === 'erro' ? 'alert' : 'status'} className={`anim-surgir rounded-sm border bg-superficie px-3 py-2 text-sm ${cor}`}>
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

// Cabeçalho editorial das páginas: legenda pequena, título grande e uma linha fina.
export function CabecalhoPagina({
  rotulo,
  titulo,
  acoes,
}: {
  rotulo?: string
  titulo: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className="anim-entrar flex flex-wrap items-end justify-between gap-4 border-b border-linha pb-5">
      <div>
        {rotulo && <p className="eyebrow mb-2">{rotulo}</p>}
        <h1 className="titulo-pagina">{titulo}</h1>
      </div>
      {acoes}
    </header>
  )
}

// Espaço reservado enquanto carrega, no lugar do texto "Carregando...".
export function Esqueleto({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`anim-respirar rounded-sm bg-areia ${className}`} />
}
