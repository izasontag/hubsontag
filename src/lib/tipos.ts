export type Papel = 'dona' | 'equipe'

export interface Perfil {
  id: string
  nome: string
  email: string
  papel: Papel
}

export type StatusCliente = 'ativo' | 'pausado' | 'encerrado'

export interface Cliente {
  id: string
  nome: string
  token_portal: string
  portal_ativo: boolean
  instagram: string | null
  nicho: string | null
  contato: string | null
  status: StatusCliente
  data_inicio: string | null
  cor_destaque: string
  observacoes: string | null
}

export const CAPITULOS = [
  {
    chave: 'essencia',
    titulo: 'Essência',
    dica: 'Quem é, propósito, missão e história.',
  },
  {
    chave: 'posicionamento',
    titulo: 'Posicionamento',
    dica: 'Promessa e diferenciais.',
  },
  {
    chave: 'publico',
    titulo: 'Público',
    dica: 'Persona, dores, desejos e objeções.',
  },
  {
    chave: 'estrategia',
    titulo: 'Estratégia',
    dica: 'Objetivo do perfil, pilares com percentual, formatos prioritários e frequência.',
  },
  {
    chave: 'tom_voz',
    titulo: 'Tom de voz',
    dica: 'Como fala, palavras que usa, palavras que evita e exemplos de legendas.',
  },
  {
    chave: 'identidade_visual',
    titulo: 'Identidade visual',
    dica: 'Cores com código, fontes, logos e exemplos.',
  },
  {
    chave: 'regras',
    titulo: 'Regras',
    dica: 'O que nunca pode aparecer e regras do conselho profissional (OAB, CFO, CFM).',
  },
] as const

export type ChaveCapitulo = (typeof CAPITULOS)[number]['chave']
export type Manual = Record<ChaveCapitulo, string | null>

export interface Meta {
  id: string
  cliente_id: string
  nome: string
  valor_atual: number
  valor_meta: number
  prazo: string | null
}

export interface Acesso {
  id: string
  cliente_id: string
  servico: string
  link: string | null
  observacao: string | null
}

export type TipoHistorico = 'reuniao' | 'decisao' | 'feedback'

export interface Historico {
  id: string
  cliente_id: string
  data: string
  tipo: TipoHistorico
  texto: string
}
