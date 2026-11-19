import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTravaRolagem } from '../lib/trava'
import Portal from './Portal'

interface Opcao {
  chave: string
  grupo: string
  rotulo: string
  detalhe?: string
  acao: () => void
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Busca rápida (Ctrl+K): vai para qualquer tela, cliente ou evento e abre o lançamento rápido.
export default function Paleta({ dona, onFechar, onLancar }: { dona: boolean; onFechar: () => void; onLancar: () => void }) {
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [eventos, setEventos] = useState<{ id: string; nome: string; data_evento: string }[]>([])
  const [ativa, setAtiva] = useState(0)
  const campo = useRef<HTMLInputElement>(null)
  useTravaRolagem()

  useEffect(() => {
    campo.current?.focus()
    void Promise.all([
      supabase.from('clientes').select('id, nome').neq('status', 'encerrado').order('nome'),
      supabase.from('eventos').select('id, nome, data_evento').neq('status', 'cancelado').order('data_evento', { ascending: false }).limit(100),
    ]).then(([c, e]) => {
      setClientes((c.data as { id: string; nome: string }[]) ?? [])
      setEventos((e.data as { id: string; nome: string; data_evento: string }[]) ?? [])
    })
  }, [])

  const ir = (rota: string) => () => {
    onFechar()
    navegar(rota)
  }

  const todas = useMemo<Opcao[]>(() => {
    const paginas: Opcao[] = [
      { chave: 'p-painel', grupo: 'Ir para', rotulo: 'Painel', acao: ir('/app') },
      { chave: 'p-clientes', grupo: 'Ir para', rotulo: 'Clientes', acao: ir('/app/clientes') },
      { chave: 'p-cal', grupo: 'Ir para', rotulo: 'Calendário geral', acao: ir('/app/calendario') },
      { chave: 'p-tar', grupo: 'Ir para', rotulo: 'Tarefas', acao: ir('/app/tarefas') },
      { chave: 'p-ideias', grupo: 'Ir para', rotulo: 'Ideias', acao: ir('/app/ideias') },
      { chave: 'p-eventos', grupo: 'Ir para', rotulo: 'Eventos', acao: ir('/app/eventos') },
      ...(dona
        ? [
            { chave: 'p-prec', grupo: 'Ir para', rotulo: 'Precificação', acao: ir('/app/precificacao') },
            { chave: 'p-fin', grupo: 'Ir para', rotulo: 'Financeiro da agência', acao: ir('/app/financeiro') },
            { chave: 'p-gfa', grupo: 'Ir para', rotulo: 'Gastos fixos da agência', acao: ir('/app/financeiro?aba=gastos') },
            { chave: 'p-pes', grupo: 'Ir para', rotulo: 'Financeiro pessoal e gastos fixos', acao: ir('/app/financeiro/pessoal') },
            { chave: 'p-eq', grupo: 'Ir para', rotulo: 'Equipe', acao: ir('/app/equipe') },
          ]
        : []),
    ]
    const acoes: Opcao[] = [
      { chave: 'a-lancar', grupo: 'Fazer', rotulo: 'Lançamento rápido (gasto, recebimento, roteiro...)', acao: () => { onFechar(); onLancar() } },
      ...(dona ? [{ chave: 'a-cli', grupo: 'Fazer', rotulo: 'Novo cliente', acao: ir('/app/clientes/novo') }] : []),
    ]
    return [
      ...acoes,
      ...paginas,
      ...clientes.map((c) => ({ chave: `c-${c.id}`, grupo: 'Clientes', rotulo: c.nome, acao: ir(`/app/clientes/${c.id}`) })),
      ...eventos.map((e) => ({ chave: `e-${e.id}`, grupo: 'Eventos', rotulo: e.nome, detalhe: e.data_evento.split('-').reverse().join('/'), acao: ir(`/app/eventos/${e.id}`) })),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dona, clientes, eventos])

  const termo = normalizar(busca.trim())
  const lista = useMemo(() => (termo ? todas.filter((o) => normalizar(`${o.rotulo} ${o.grupo}`).includes(termo)) : todas.filter((o) => o.grupo !== 'Eventos' || false).slice(0, 14)).slice(0, 14), [todas, termo])

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtiva((a) => Math.min(lista.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtiva((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      lista[Math.min(ativa, lista.length - 1)]?.acao()
    } else if (e.key === 'Escape') onFechar()
  }

  return (
    <Portal>
    <div className="modal-fundo fixed inset-0 z-[60] flex items-start justify-center bg-texto/40 p-4 pt-[12vh] " role="dialog" aria-modal="true" aria-label="Busca rápida" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal-painel w-full max-w-lg overflow-hidden rounded-[18px] border border-linha bg-superficie shadow-elevada">
        <input
          ref={campo}
          role="combobox"
          aria-expanded
          aria-controls="paleta-lista"
          aria-label="Buscar"
          className="w-full border-b border-linha bg-transparent px-5 py-4 text-base outline-none placeholder:text-texto-suave"
          placeholder="Ir para, buscar cliente ou evento..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setAtiva(0)
          }}
          onKeyDown={aoTeclar}
        />
        <ul id="paleta-lista" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {lista.length === 0 && <li className="px-3 py-6 text-center text-sm text-texto-suave">Nada encontrado.</li>}
          {lista.map((o, i) => (
            <li key={o.chave} role="option" aria-selected={i === ativa}>
              <button
                type="button"
                onMouseEnter={() => setAtiva(i)}
                onClick={o.acao}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[12px] px-3 text-left text-sm transition-colors ${i === ativa ? 'bg-azul-claro text-azul-escuro' : 'hover:bg-areia'}`}
              >
                <span className="truncate">{o.rotulo}</span>
                <span className="eyebrow shrink-0 !text-[0.6rem]">{o.detalhe ? `${o.grupo} · ${o.detalhe}` : o.grupo}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-linha px-4 py-2 text-xs text-texto-suave">Setas para escolher, Enter para abrir, Esc para fechar.</p>
      </div>
    </div>
    </Portal>
  )
}
