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
  recado_portal: string | null
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

// ---------------- Calendário editorial ----------------

export const STATUS_POST = [
  'ideia',
  'roteiro',
  'design',
  'em_aprovacao',
  'ajuste_pedido',
  'aprovado',
  'agendado',
  'publicado',
] as const
export type StatusPost = (typeof STATUS_POST)[number]

export const STATUS_POST_ROTULO: Record<StatusPost, string> = {
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  design: 'Design',
  em_aprovacao: 'Em aprovação',
  ajuste_pedido: 'Ajuste pedido',
  aprovado: 'Aprovado',
  agendado: 'Agendado',
  publicado: 'Publicado',
}

export const FORMATOS = ['carrossel', 'reels', 'post_unico', 'stories'] as const
export type FormatoPost = (typeof FORMATOS)[number]

export const FORMATO_ROTULO: Record<FormatoPost, string> = {
  carrossel: 'Carrossel',
  reels: 'Reels',
  post_unico: 'Post único',
  stories: 'Stories',
}

export type Desempenho = 'bom' | 'media' | 'abaixo'

export const DESEMPENHO_ROTULO: Record<Desempenho, string> = {
  bom: 'Performando bem',
  media: 'Na média',
  abaixo: 'Abaixo do esperado',
}

export interface Tag {
  id: string
  nome: string
  cor: string
  cliente_id: string | null
}

export type TipoMidia = 'imagem' | 'video'

export interface Midia {
  id: string
  post_id: string
  caminho_storage: string | null
  ordem: number
  tipo: TipoMidia
  link_externo: string | null
  capa_storage: string | null
}

// Mídia como o feed mostra (vem da área interna ou do portal)
export interface MidiaVista {
  tipo: TipoMidia
  caminho: string | null
  link: string | null
  capa?: string | null
}

export interface Rodada {
  id: string
  cliente_id: string
  titulo: string
  inicio: string | null
  fim: string | null
  status: 'rascunho' | 'enviada'
  enviada_em: string | null
}

export interface Post {
  id: string
  cliente_id: string
  data_publicacao: string
  horario: string | null
  formato: FormatoPost
  pilar: string | null
  formato_cbs: string | null
  tema: string | null
  gancho: string | null
  copy: string | null
  legenda: string | null
  status: StatusPost
  prazo_interno: string | null
  desempenho: Desempenho | null
  alcance: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  comentarios_qtd: number | null
  nota_desempenho: string | null
  rodada_id: string | null
}

// Post como vem da consulta do calendário (com cliente, tags e artes)
export interface PostCompleto extends Post {
  cliente: { nome: string; cor_destaque: string } | null
  post_tags: { tag_id: string }[]
  post_midias: Midia[]
}

export type ClienteResumo = Pick<Cliente, 'id' | 'nome' | 'cor_destaque'>

// ---------------- Portal do cliente ----------------

export interface PortalDados {
  nome: string
  instagram: string | null
  nicho: string | null
  cor_destaque: string
  recado: string | null
}

export interface PortalComentario {
  id: string
  origem: 'interno' | 'portal'
  texto: string
  referencia: string | null
  criado_em: string
}

export interface PortalAprovacao {
  decisao: 'aprovado' | 'ajuste_pedido'
  mensagem: string | null
  criado_em: string
}

export interface PortalPost {
  id: string
  data_publicacao: string
  horario: string | null
  formato: FormatoPost
  pilar: string | null
  formato_cbs: string | null
  tema: string | null
  gancho: string | null
  copy: string | null
  legenda: string | null
  status: StatusPost
  desempenho: Desempenho | null
  alcance: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  comentarios_qtd: number | null
  nota_desempenho: string | null
  rodada_id: string | null
  tags: { nome: string; cor: string }[]
  midias: MidiaVista[]
  comentarios: PortalComentario[]
  aprovacoes: PortalAprovacao[]
}

export interface PortalRodada {
  id: string
  titulo: string
  inicio: string | null
  fim: string | null
  enviada_em: string
}
