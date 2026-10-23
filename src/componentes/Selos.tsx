import { DESEMPENHO_ROTULO, STATUS_POST_ROTULO } from '../lib/tipos'
import type { Desempenho, StatusPost, Tag } from '../lib/tipos'

const base = 'inline-block max-w-full break-words rounded-sm border px-1.5 py-0.5 text-xs leading-tight'

const ESTILO_STATUS: Record<StatusPost, string> = {
  ideia: 'border-linha text-texto-suave',
  roteiro: 'border-linha text-texto-suave',
  design: 'border-linha text-texto-suave',
  em_aprovacao: 'border-marrom text-marrom',
  ajuste_pedido: 'border-marrom bg-marrom text-superficie',
  aprovado: 'border-musgo text-musgo',
  agendado: 'border-musgo text-musgo',
  publicado: 'border-musgo bg-musgo text-superficie',
}

export function SeloStatus({ status }: { status: StatusPost }) {
  return <span className={`${base} ${ESTILO_STATUS[status]}`}>{STATUS_POST_ROTULO[status]}</span>
}

const ESTILO_DESEMPENHO: Record<Desempenho, string> = {
  bom: 'border-musgo bg-musgo text-superficie',
  media: 'border-texto-suave bg-texto-suave text-superficie',
  abaixo: 'border-marrom bg-marrom text-superficie',
}

export function SeloDesempenho({ desempenho }: { desempenho: Desempenho }) {
  return <span className={`${base} ${ESTILO_DESEMPENHO[desempenho]}`}>{DESEMPENHO_ROTULO[desempenho]}</span>
}

export function ChipTag({ tag }: { tag: Pick<Tag, 'nome' | 'cor'> }) {
  return (
    <span className={`${base} inline-flex items-center gap-1 border-linha text-texto`}>
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: tag.cor }} />
      {tag.nome}
    </span>
  )
}
