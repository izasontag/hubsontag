// Páginas carregadas sob demanda: o site abre mais rápido porque cada tela só baixa quando é usada.
// O menu antecipa o download quando o mouse passa por cima (ou o dedo encosta).
import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

const carregadores = {
  painel: () => import('../paginas/Painel'),
  calendario: () => import('../paginas/CalendarioGeral'),
  ideias: () => import('../paginas/Ideias'),
  tarefas: () => import('../paginas/Tarefas'),
  eventos: () => import('../paginas/Eventos'),
  evento: () => import('../paginas/EventoPagina'),
  equipe: () => import('../paginas/Equipe'),
  financeiro: () => import('../paginas/financeiro/Financeiro'),
  agencia: () => import('../paginas/financeiro/Agencia'),
  pessoal: () => import('../paginas/financeiro/Pessoal'),
  clientes: () => import('../paginas/Clientes'),
  clienteNovo: () => import('../paginas/ClienteNovo'),
  cliente: () => import('../paginas/ClientePagina'),
  precificacao: () => import('../paginas/Precificacao'),
  orcamento: () => import('../paginas/OrcamentoPagina'),
  portalLayout: () => import('../paginas/portal/PortalLayout'),
  portalInicio: () => import('../paginas/portal/PortalInicio'),
  portalAprovacoes: () => import('../paginas/portal/PortalAprovacoes'),
  portalFeed: () => import('../paginas/portal/PortalFeed'),
  portalPlano: () => import('../paginas/portal/PortalPlano'),
  portalCalendario: () => import('../paginas/portal/PortalCalendario'),
  portalManual: () => import('../paginas/portal/PortalManual'),
  portalMateriais: () => import('../paginas/portal/PortalMateriais'),
  portalRelatorios: () => import('../paginas/portal/PortalRelatorios'),
  portalEvento: () => import('../paginas/portal/PortalEventoPagina'),
}

export const Pagina = Object.fromEntries(Object.entries(carregadores).map(([k, f]) => [k, lazy(f as () => Promise<{ default: ComponentType }>)])) as unknown as Record<keyof typeof carregadores, LazyExoticComponent<ComponentType>>

// rota do menu -> página que ela abre
const porRota: Record<string, keyof typeof carregadores> = {
  '/app': 'painel',
  '/app/clientes': 'clientes',
  '/app/calendario': 'calendario',
  '/app/tarefas': 'tarefas',
  '/app/ideias': 'ideias',
  '/app/precificacao': 'precificacao',
  '/app/eventos': 'eventos',
  '/app/financeiro': 'financeiro',
  '/app/equipe': 'equipe',
}

const jaPedidas = new Set<string>()
export function antecipar(rota: string) {
  const chave = porRota[rota]
  if (!chave || jaPedidas.has(chave)) return
  jaPedidas.add(chave)
  void carregadores[chave]().catch(() => jaPedidas.delete(chave))
  if (chave === 'financeiro') void carregadores.agencia().catch(() => undefined)
}
