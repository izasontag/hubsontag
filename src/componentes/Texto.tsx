import type { ReactNode } from 'react'

// Texto livre "estilo Notion": títulos (# ## ###), listas (- ou 1.), citação (>), linha (---), **negrito**,
// *itálico* e links. Só monta elementos do React (nunca HTML bruto), então é seguro mostrar o que a dona escreveu.
function inline(t: string): ReactNode[] {
  const partes: ReactNode[] = []
  const regra = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|https?:\/\/[^\s<>)]+)/g
  let ultimo = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = regra.exec(t)) !== null) {
    if (m.index > ultimo) partes.push(t.slice(ultimo, m.index))
    const x = m[0]
    if (x.startsWith('**')) partes.push(<strong key={k++}>{x.slice(2, -2)}</strong>)
    else if (x.startsWith('*')) partes.push(<em key={k++}>{x.slice(1, -1)}</em>)
    else partes.push(<a key={k++} href={x} target="_blank" rel="noreferrer noopener" className="break-all text-marrom underline">{x}</a>)
    ultimo = m.index + x.length
  }
  if (ultimo < t.length) partes.push(t.slice(ultimo))
  return partes
}

export default function Texto({ texto, className = '' }: { texto: string | null | undefined; className?: string }) {
  if (!texto || !texto.trim()) return null
  const linhas = texto.replace(/\r/g, '').split('\n')
  const blocos: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < linhas.length) {
    const l = linhas[i]
    if (!l.trim()) {
      i += 1
      continue
    }
    let m: RegExpMatchArray | null
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
      const nivel = m[1].length
      const cls = nivel === 1 ? 'font-titulo text-2xl font-semibold mt-6' : nivel === 2 ? 'font-titulo text-xl font-semibold mt-5' : 'eyebrow mt-4'
      blocos.push(<p key={k++} className={cls} role="heading" aria-level={nivel + 2}>{inline(m[2])}</p>)
      i += 1
    } else if (/^---+$/.test(l.trim())) {
      blocos.push(<hr key={k++} className="my-4 border-linha" />)
      i += 1
    } else if (/^\s*[-*]\s+/.test(l)) {
      const itens: ReactNode[] = []
      while (i < linhas.length && /^\s*[-*]\s+/.test(linhas[i])) {
        itens.push(<li key={itens.length}>{inline(linhas[i].replace(/^\s*[-*]\s+/, ''))}</li>)
        i += 1
      }
      blocos.push(<ul key={k++} className="list-disc space-y-1 pl-6">{itens}</ul>)
    } else if (/^\s*\d+[.)]\s+/.test(l)) {
      const itens: ReactNode[] = []
      while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) {
        itens.push(<li key={itens.length}>{inline(linhas[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>)
        i += 1
      }
      blocos.push(<ol key={k++} className="list-decimal space-y-1 pl-6">{itens}</ol>)
    } else if (/^>\s?/.test(l)) {
      const q: string[] = []
      while (i < linhas.length && /^>\s?/.test(linhas[i])) {
        q.push(linhas[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocos.push(<blockquote key={k++} className="border-l-4 border-linha pl-4 italic text-texto-suave">{inline(q.join(' '))}</blockquote>)
    } else {
      const p: string[] = []
      while (i < linhas.length && linhas[i].trim() && !/^(#{1,3}\s|---+$|\s*[-*]\s|\s*\d+[.)]\s|>)/.test(linhas[i])) {
        p.push(linhas[i])
        i += 1
      }
      blocos.push(<p key={k++} className="leading-relaxed">{p.map((x, j) => (j > 0 ? [<br key={`b${j}`} />, ...inline(x)] : inline(x)))}</p>)
    }
  }
  return <div className={`space-y-3 text-[0.95rem] ${className}`}>{blocos}</div>
}

export const DICA_TEXTO = 'Dica: # título, ## subtítulo, - lista, 1. lista numerada, > citação, **negrito**, *itálico*.'
