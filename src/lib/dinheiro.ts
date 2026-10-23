export const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Eixos e rótulos curtos: 0, 500, 1,5 mil, 12 mil, 1,2 mi
export function reaisCompacto(n: number) {
  const abs = Math.abs(n)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)} mi`
  if (abs >= 1_000) return `${fmt(n / 1_000)} mil`
  return fmt(n)
}

export const numero = (texto: string) => {
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const soma = <T,>(itens: T[], valor: (t: T) => number) => itens.reduce((t, i) => t + valor(i), 0)

export const reaisInteiro = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
