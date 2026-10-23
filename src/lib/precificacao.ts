// Cálculo da precificação. Funções puras, sem tela, para o resultado ser sempre o mesmo.
//
// Lógica: o preço é composto assim (tudo em % do PREÇO FINAL, para a conta fechar):
//   preço = custos / (1 − lucro% − imposto%)
//   custos = tempo (horas × valor da hora, com adicional) + custos diretos (deslocamento, equipe, aluguel...)

export interface LinhaTempo {
  id: string
  fase: string // pré-produção, no dia, pós-produção...
  descricao: string
  horas: number // horas de cada vez
  qtd: number // quantas vezes (ou dias)
}

export interface LinhaCusto {
  id: string
  descricao: string
  valor: number // valor unitário
  qtd: number
}

export interface Parametros {
  valorHora: number
  impostoPct: number
  lucroPct: number
  adicionalPct: number // aplicado só sobre o tempo marcado como "adicional" (fim de semana, feriado, urgência)
  descontoPct: number
  cobrado: number // valor que a dona decidiu cobrar de verdade (0 = usar o sugerido com o desconto acima)
  aplicarAdicional: boolean
}

export interface DadosOrcamento {
  tempo: LinhaTempo[]
  custos: LinhaCusto[]
  parametros: Parametros
  observacoes?: string
}

export interface Resultado {
  horas: number
  custoTempo: number
  adicional: number
  custosDiretos: number
  custoTotal: number
  precoSugerido: number
  precoMinimo: number // cobre custos e impostos, sem lucro
  precoPremium: number // lucro 10 pontos maior
  desconto: number
  precoFinal: number
  imposto: number
  lucro: number
  lucroReal: number // depois do desconto
  valorPorHora: number // o que sobra por hora trabalhada (lucro + tempo pago)
  folga: boolean // false se os percentuais não fecham (lucro + imposto >= 100)
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)
const arred = (n: number) => Math.round(n * 100) / 100

export function calcular(d: DadosOrcamento): Resultado {
  const p = d.parametros
  const horas = d.tempo.reduce((t, l) => t + pos(l.horas) * pos(l.qtd), 0)
  const custoTempo = horas * pos(p.valorHora)
  const adicional = p.aplicarAdicional ? custoTempo * (pos(p.adicionalPct) / 100) : 0
  const custosDiretos = d.custos.reduce((t, c) => t + pos(c.valor) * pos(c.qtd), 0)
  const custoTotal = custoTempo + adicional + custosDiretos

  const imp = pos(p.impostoPct) / 100
  const luc = pos(p.lucroPct) / 100
  const folga = imp + luc < 0.95
  const divisor = (l: number) => Math.max(1 - imp - l, 0.05)

  const precoSugerido = custoTotal / divisor(luc)
  const precoMinimo = custoTotal / divisor(0)
  const precoPremium = custoTotal / divisor(luc + 0.1)
  const precoFinal = pos(p.cobrado) > 0 ? pos(p.cobrado) : precoSugerido * (1 - pos(p.descontoPct) / 100)
  const desconto = precoSugerido - precoFinal // negativo = cobrando acima do sugerido
  const imposto = precoFinal * imp
  const lucroReal = precoFinal - imposto - custoTotal
  const lucro = precoSugerido * luc

  return {
    horas: arred(horas),
    custoTempo: arred(custoTempo),
    adicional: arred(adicional),
    custosDiretos: arred(custosDiretos),
    custoTotal: arred(custoTotal),
    precoSugerido: arred(precoSugerido),
    precoMinimo: arred(precoMinimo),
    precoPremium: arred(precoPremium),
    desconto: arred(desconto),
    precoFinal: arred(precoFinal),
    imposto: arred(imposto),
    lucro: arred(lucro),
    lucroReal: arred(lucroReal),
    valorPorHora: horas > 0 ? arred((precoFinal - imposto - custosDiretos) / horas) : 0,
    folga,
  }
}

// Quanto vale a sua hora: (o que quer ganhar + custos fixos) ÷ horas que realmente viram trabalho pago.
export function valorDaHora(renda: number, custosFixos: number, diasMes: number, horasDia: number, pctFaturavel: number) {
  const horasPagas = pos(diasMes) * pos(horasDia) * (pos(pctFaturavel) / 100)
  return horasPagas > 0 ? arred((pos(renda) + pos(custosFixos)) / horasPagas) : 0
}

export const novoId = () => crypto.randomUUID()

export type TipoOrcamento = 'evento' | 'mensal' | 'avulso'

// Modelos para começar rápido (a dona ajusta as horas)
export const MODELOS: Record<TipoOrcamento, { rotulo: string; tempo: Omit<LinhaTempo, 'id'>[]; custos: Omit<LinhaCusto, 'id'>[] }> = {
  evento: {
    rotulo: 'Cobertura de evento (stories)',
    tempo: [
      { fase: 'Antes', descricao: 'Reunião de alinhamento', horas: 1, qtd: 1 },
      { fase: 'Antes', descricao: 'Roteiro e planejamento da cobertura', horas: 2, qtd: 1 },
      { fase: 'Antes', descricao: 'Visita ao local', horas: 2, qtd: 1 },
      { fase: 'No dia', descricao: 'Deslocamento (ida e volta)', horas: 1, qtd: 2 },
      { fase: 'No dia', descricao: 'Cobertura no evento', horas: 8, qtd: 1 },
      { fase: 'Depois', descricao: 'Edição e organização do material', horas: 3, qtd: 1 },
      { fase: 'Depois', descricao: 'Entrega e ajustes', horas: 1, qtd: 1 },
    ],
    custos: [
      { descricao: 'Alimentação no dia', valor: 40, qtd: 1 },
      { descricao: 'Deslocamento (km)', valor: 1.5, qtd: 40 },
    ],
  },
  mensal: {
    rotulo: 'Social media mensal',
    tempo: [
      { fase: 'Planejamento', descricao: 'Planejamento e calendário do mês', horas: 4, qtd: 1 },
      { fase: 'Conteúdo', descricao: 'Roteiros e legendas', horas: 6, qtd: 1 },
      { fase: 'Conteúdo', descricao: 'Design de carrossel', horas: 1.5, qtd: 12 },
      { fase: 'Conteúdo', descricao: 'Edição de reels', horas: 2, qtd: 4 },
      { fase: 'Captação', descricao: 'Captação de fotos e vídeos', horas: 3, qtd: 2 },
      { fase: 'Gestão', descricao: 'Atendimento, aprovações e relatório', horas: 4, qtd: 1 },
    ],
    custos: [{ descricao: 'Ferramentas e banco de imagens', valor: 60, qtd: 1 }],
  },
  avulso: {
    rotulo: 'Trabalho avulso',
    tempo: [
      { fase: 'Projeto', descricao: 'Briefing e reunião', horas: 1, qtd: 1 },
      { fase: 'Projeto', descricao: 'Criação', horas: 4, qtd: 1 },
      { fase: 'Projeto', descricao: 'Ajustes e entrega', horas: 2, qtd: 1 },
    ],
    custos: [],
  },
}

export function dadosDoModelo(tipo: TipoOrcamento, p: Parametros, custoKm?: number): DadosOrcamento {
  const m = MODELOS[tipo]
  return {
    tempo: m.tempo.map((l) => ({ ...l, id: novoId() })),
    custos: m.custos.map((c) => ({ ...c, id: novoId(), valor: c.descricao.startsWith('Deslocamento') && custoKm ? custoKm : c.valor })),
    parametros: p,
  }
}
