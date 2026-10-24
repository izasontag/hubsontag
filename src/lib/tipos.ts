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
  objetivo: string | null
  suporte: string | null
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
  {
    chave: 'diagnostico',
    titulo: 'Diagnóstico',
    dica: 'Análise do perfil hoje: o que funciona, o que falta e as oportunidades.',
  },
  {
    chave: 'como_trabalhamos',
    titulo: 'Como vamos trabalhar',
    dica: 'Rotina de entregas, prazos de aprovação, canais de contato e responsabilidades de cada lado.',
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
  objetivo: string | null
  suporte: string | null
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

// ---------------- Prompts e skills ----------------

export const CATEGORIAS_PROMPT = ['design', 'video', 'legenda', 'outro'] as const
export type CategoriaPrompt = (typeof CATEGORIAS_PROMPT)[number]

export const CATEGORIA_PROMPT_ROTULO: Record<CategoriaPrompt, string> = {
  design: 'Design',
  video: 'Edição de vídeo',
  legenda: 'Legendas',
  outro: 'Outros',
}

export interface Prompt {
  id: string
  cliente_id: string | null
  categoria: CategoriaPrompt
  titulo: string
  ferramenta: string | null
  texto: string
  notas: string | null
}

// ---------------- Banco de ideias ----------------

export const TIPOS_IDEIA = ['ideia_post', 'referencia_visual', 'filme', 'livro', 'trend', 'formato_funcionou'] as const
export type TipoIdeia = (typeof TIPOS_IDEIA)[number]

export const TIPO_IDEIA_ROTULO: Record<TipoIdeia, string> = {
  ideia_post: 'Ideia de post',
  referencia_visual: 'Referência visual',
  filme: 'Filme',
  livro: 'Livro',
  trend: 'Trend',
  formato_funcionou: 'Formato que funcionou',
}

export interface ArquivoIdeia {
  id: string
  ideia_id: string
  caminho_storage: string
  nome: string
  tipo: 'imagem' | 'video' | 'arquivo'
  ordem: number
}

export interface Ideia {
  id: string
  texto: string
  tipo: TipoIdeia
  cliente_id: string | null
  para_sontag: boolean
  tags: string[]
  fonte: string | null
  post_id: string | null
  criado_em: string
  ideia_arquivos: ArquivoIdeia[]
}

// ---------------- Tarefas e modelos de checklist ----------------

export const STATUS_TAREFA = ['fazer', 'fazendo', 'feito'] as const
export type StatusTarefa = (typeof STATUS_TAREFA)[number]
export const STATUS_TAREFA_ROTULO: Record<StatusTarefa, string> = { fazer: 'Fazer', fazendo: 'Fazendo', feito: 'Feito' }

export const TIPOS_TAREFA = ['tarefa', 'reuniao', 'captacao', 'entrega'] as const
export type TipoTarefa = (typeof TIPOS_TAREFA)[number]
export const TIPO_TAREFA_ROTULO: Record<TipoTarefa, string> = {
  tarefa: 'Tarefa',
  reuniao: 'Reunião',
  captacao: 'Captação',
  entrega: 'Entrega',
}

export type Responsavel = 'agencia' | 'cliente'

export interface Tarefa {
  id: string
  cliente_id: string | null
  titulo: string
  data: string | null
  tipo: TipoTarefa
  status: StatusTarefa
  responsavel: Responsavel
  visivel_cliente: boolean
  material: string | null
  cliente: { nome: string } | null
}

export interface ItemModelo {
  titulo: string
  dias?: number
  tipo?: TipoTarefa
  responsavel?: Responsavel
  visivel_cliente?: boolean
}

export interface Modelo {
  id: string
  nome: string
  descricao: string | null
  itens: ItemModelo[]
}

export interface PortalTarefa {
  id: string
  titulo: string
  data: string | null
  tipo: TipoTarefa
  status: StatusTarefa
  responsavel: Responsavel
  material: string | null
}

// ---------------- Financeiro ----------------

export type StatusCobranca = 'a_vencer' | 'pago' | 'atrasado'
export const STATUS_COBRANCA_ROTULO: Record<StatusCobranca, string> = { a_vencer: 'A vencer', pago: 'Pago', atrasado: 'Atrasado' }

export const FORMAS_PAGAMENTO = ['pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro'] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]
export const FORMA_ROTULO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
}

export interface Contrato {
  id: string
  cliente_id: string
  plano: string
  posts_mes: number
  reels_mes: number
  stories_mes: number
  valor_mensal: number
  dia_vencimento: number
  inicio: string
  renovacao: string | null
  status: 'ativo' | 'encerrado'
  arquivo_storage: string | null
  cliente: { nome: string } | null
}

export interface Cobranca {
  id: string
  contrato_id: string | null
  projeto_id: string | null
  cliente_id: string | null
  descricao: string
  vencimento: string
  valor: number
  forma_pagamento: FormaPagamento | null
  status: StatusCobranca
  pago_em: string | null
  cliente: { nome: string } | null
}

export const CATEGORIAS_DESPESA = ['ferramentas', 'freelancers', 'impostos', 'cursos', 'outros'] as const
export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number]
export const CATEGORIA_DESPESA_ROTULO: Record<CategoriaDespesa, string> = {
  ferramentas: 'Ferramentas',
  freelancers: 'Freelancers',
  impostos: 'Impostos',
  cursos: 'Cursos',
  outros: 'Outros',
}

export interface Despesa {
  id: string
  data: string
  categoria: CategoriaDespesa
  descricao: string
  valor: number
}

export const STATUS_AVULSO = ['proposta', 'em_andamento', 'concluido', 'cancelado'] as const
export type StatusAvulso = (typeof STATUS_AVULSO)[number]
export const STATUS_AVULSO_ROTULO: Record<StatusAvulso, string> = {
  proposta: 'Proposta',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export interface Avulso {
  id: string
  cliente_id: string | null
  nome: string
  valor: number
  status: StatusAvulso
  data: string
  cliente: { nome: string } | null
}

export const CATEGORIAS_PESSOAL = [
  'pro_labore',
  'contas_fixas',
  'alimentacao',
  'saude',
  'transporte',
  'lazer',
  'educacao',
  'investimentos',
  'outros',
] as const
export const CATEGORIA_PESSOAL_ROTULO: Record<string, string> = {
  pro_labore: 'Pró-labore',
  contas_fixas: 'Contas fixas',
  alimentacao: 'Alimentação',
  saude: 'Saúde',
  transporte: 'Transporte',
  lazer: 'Lazer',
  educacao: 'Educação',
  investimentos: 'Investimentos',
  outros: 'Outros',
}

export interface Lancamento {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: number
}

export interface MetaPessoal {
  id: string
  nome: string
  valor_meta: number
  valor_atual: number
  prazo: string | null
}

// ---------------- Eventos e casamentos ----------------

export const STATUS_EVENTO = ['em_negociacao', 'contrato_assinado', 'em_andamento', 'realizado', 'entregue', 'cancelado'] as const
export type StatusEvento = (typeof STATUS_EVENTO)[number]
export const STATUS_EVENTO_ROTULO: Record<StatusEvento, string> = {
  em_negociacao: 'Em negociação',
  contrato_assinado: 'Contrato assinado',
  em_andamento: 'Em andamento',
  realizado: 'Realizado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export interface Evento {
  id: string
  nome: string
  tipo: 'casamento' | 'evento'
  categoria: string | null
  data_evento: string
  horario: string | null
  local: string | null
  contato: string | null
  status: StatusEvento
  contrato_storage: string | null
  observacoes: string | null
  token_portal: string
  portal_ativo: boolean
  recado_portal: string | null
}

export interface ItemEvento {
  id: string
  evento_id: string
  titulo: string
  concluido: boolean
  prazo: string | null
  ordem: number
}

export interface Parcela {
  id: string
  evento_id: string
  descricao: string
  vencimento: string
  valor: number
  forma_pagamento: FormaPagamento | null
  status: StatusCobranca
  pago_em: string | null
}

// ---------------- Painel: atalhos, versículos, equipe, relatórios ----------------

export interface Atalho {
  id: string
  tipo: 'agenda' | 'pinterest_quadro' | 'pinterest_pin'
  titulo: string
  url: string
  ordem: number
}

export interface VersiculoProprio {
  id: string
  referencia: string
  texto: string
}

export interface Relatorio {
  id: string
  cliente_id: string
  mes: string
  resumo: string | null
  destaques: string | null
  proximos_passos: string | null
}

// ---------------- Roteiros (por cliente e por evento) ----------------

export const FORMATOS_ROTEIRO = ['reels', 'carrossel', 'stories', 'video', 'evento', 'outro'] as const
export type FormatoRoteiro = (typeof FORMATOS_ROTEIRO)[number]
export const FORMATO_ROTEIRO_ROTULO: Record<FormatoRoteiro, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  stories: 'Stories',
  video: 'Vídeo',
  evento: 'Evento',
  outro: 'Outro',
}

export const STATUS_ROTEIRO = ['rascunho', 'em_revisao', 'aprovado', 'gravado', 'publicado'] as const
export type StatusRoteiro = (typeof STATUS_ROTEIRO)[number]
export const STATUS_ROTEIRO_ROTULO: Record<StatusRoteiro, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  gravado: 'Gravado',
  publicado: 'Publicado',
}

export interface Roteiro {
  id: string
  cliente_id: string | null
  evento_id: string | null
  titulo: string
  formato: FormatoRoteiro
  status: StatusRoteiro
  data_prevista: string | null
  texto: string | null
  arquivo_storage: string | null
  arquivo_nome: string | null
}

// Sugestões para "Que tipo de evento é?" (a dona também pode escrever outro).
export const CATEGORIAS_EVENTO = ['Casamento', 'Aniversário', 'Debutante', 'Formatura', 'Corporativo', 'Batizado', 'Chá de bebê', 'Noivado', 'Show', 'Outro']

// ---------------- Portal do evento ----------------

export interface PerguntaEvento {
  id: string
  evento_id: string
  secao: string
  pergunta: string
  resposta: string | null
  respondida_em: string | null
  ordem: number
}

export interface AcessoEvento {
  evento_id: string
  usuario: string
  senha_cifrada: string
  observacao: string | null
  atualizado_em: string
}

export interface PortalEventoDados {
  nome: string
  categoria: string | null
  data_evento: string
  horario: string | null
  local: string | null
  recado: string | null
  chave_publica: string | null
  acesso: { usuario: string; enviado_em: string } | null
  perguntas: { id: string; secao: string; pergunta: string; resposta: string | null }[]
}

// ---------------- Precificação (só dona) ----------------

export interface ConfigPrecificacao {
  renda_desejada: number
  custos_fixos: number
  dias_mes: number
  horas_dia: number
  pct_faturavel: number
  valor_hora: number
  imposto_pct: number
  lucro_pct: number
  adicional_pct: number
  custo_km: number
}

export interface Orcamento {
  id: string
  nome: string
  tipo: 'evento' | 'mensal' | 'avulso'
  cliente_id: string | null
  evento_id: string | null
  status: 'rascunho' | 'enviado' | 'fechado' | 'perdido'
  dados: import('./precificacao').DadosOrcamento
  horas_total: number
  preco_sugerido: number
  preco_final: number
}
