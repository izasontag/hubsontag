// Datas como texto "AAAA-MM-DD", sem fuso horário, para não "pular" de dia.

const dois = (n: number) => String(n).padStart(2, '0')

export const mesDeHoje = () => {
  const h = new Date()
  return `${h.getFullYear()}-${dois(h.getMonth() + 1)}`
}

export const dataDeHoje = () => {
  const h = new Date()
  return `${h.getFullYear()}-${dois(h.getMonth() + 1)}-${dois(h.getDate())}`
}

export function somarMeses(mes: string, delta: number) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}`
}

export function nomeDoMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const texto = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function limitesDoMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return { inicio: `${mes}-01`, fim: `${mes}-${dois(ultimo)}` }
}

// Todos os dias do mês, com o dia da semana (0 = domingo)
export function diasDoMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return Array.from({ length: ultimo }, (_, i) => {
    const dia = i + 1
    return { data: `${mes}-${dois(dia)}`, dia, diaSemana: new Date(a, m - 1, dia).getDay() }
  })
}

export const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function diaSemanaLongo(data: string) {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' })
}

export const horaCurta = (h: string | null) => (h ? h.slice(0, 5) : '')

// Dias de hoje até a data (negativo = já passou), sem depender de fuso horário.
export function diasAte(data: string) {
  const [a, m, d] = data.split('-').map(Number)
  const [ha, hm, hd] = dataDeHoje().split('-').map(Number)
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86_400_000)
}

export function contagem(data: string) {
  const n = diasAte(data)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n > 1) return `em ${n} dias`
  if (n === -1) return 'ontem'
  return `há ${-n} dias`
}
