import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useAuth } from '../lib/auth'
import { montarContexto, prepararAcao } from '../lib/assistente'
import type { AcaoBruta, AcaoPronta } from '../lib/assistente'
import { supabase } from '../lib/supabase'
import { btnPrimario, btnSecundario } from './ui'

interface Mensagem {
  id: number
  papel: 'usuario' | 'assistente'
  texto: string
  paraIA?: string // o que a IA lê no histórico, quando for diferente do que aparece na tela
  acoes?: AcaoPronta[]
  marcadas?: Record<string, boolean>
  estado?: 'pendente' | 'confirmado' | 'cancelado'
  resultados?: Record<string, string | null>
}

const EXEMPLOS = [
  'Gastei R$ 60 no Canva hoje',
  'Recebi 2.500 da Clínica Aurora',
  'Cria o evento Casamento Lia e Caio dia 20/12, valor 6000 em 3x',
  'Coloca esse roteiro no cliente Aurora: Cena 1, abertura com a fachada...',
]

const AJUDA_LIGAR = `O assistente ainda não foi ligado no Supabase. Passo a passo:
1. Em console.anthropic.com, crie uma conta, adicione créditos (uns US$ 5 já duram bastante) e crie uma chave (API Keys).
2. No Supabase: Edge Functions > Deploy a new function > Via Editor. Nome: assistente. Cole o conteúdo do arquivo supabase/functions/assistente/index.ts do GitHub e clique em Deploy.
3. Ainda em Edge Functions: Secrets > Add new secret. Nome: ANTHROPIC_API_KEY. Valor: a chave do passo 1.
4. Volte aqui e tente de novo.`

let contador = 0

export default function AssistenteIA() {
  const { perfil } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [entrada, setEntrada] = useState('')
  const [pensando, setPensando] = useState(false)
  const [executando, setExecutando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fim.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [mensagens, pensando, aberto])

  useEffect(() => {
    if (!aberto) return
    const aoApertar = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('keydown', aoApertar)
    campo.current?.focus()
    return () => document.removeEventListener('keydown', aoApertar)
  }, [aberto])

  if (perfil?.papel !== 'dona') return null

  const nova = (m: Omit<Mensagem, 'id'>) => setMensagens((atual) => [...atual, { ...m, id: ++contador }])
  const atualizar = (id: number, campos: Partial<Mensagem>) => setMensagens((atual) => atual.map((m) => (m.id === id ? { ...m, ...campos } : m)))

  async function enviar(e?: FormEvent) {
    e?.preventDefault()
    const texto = entrada.trim()
    if (!texto || pensando) return
    setEntrada('')
    const historico = [...mensagens.map((m) => ({ papel: m.papel, texto: m.paraIA ?? m.texto })), { papel: 'usuario' as const, texto }]
    nova({ papel: 'usuario', texto })
    setPensando(true)
    try {
      const contexto = await montarContexto()
      const { data, error } = await supabase.functions.invoke('assistente', { body: { mensagens: historico, contexto } })
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status
        const naoLigado = status === 404 || error.name === 'FunctionsFetchError'
        nova({ papel: 'assistente', texto: naoLigado ? AJUDA_LIGAR : 'Algo deu errado ao falar com o assistente. Tente de novo.' })
        return
      }
      if (data?.erro) {
        nova({ papel: 'assistente', texto: String(data.mensagem ?? 'Não consegui agora.') })
        return
      }
      const brutas = (Array.isArray(data?.acoes) ? data.acoes : []) as AcaoBruta[]
      const prontas = await Promise.all(brutas.map((a) => prepararAcao(a, contexto)))
      const marcadas: Record<string, boolean> = {}
      prontas.forEach((p) => {
        if (p.ok) marcadas[p.id] = true
      })
      nova({ papel: 'assistente', texto: String(data?.mensagem ?? ''), acoes: prontas.length ? prontas : undefined, marcadas, estado: prontas.some((p) => p.ok) ? 'pendente' : undefined })
    } catch {
      nova({ papel: 'assistente', texto: 'Algo deu errado. Confira sua internet e tente de novo.' })
    } finally {
      setPensando(false)
    }
  }

  async function confirmar(m: Mensagem) {
    if (!m.acoes || executando) return
    setExecutando(true)
    const resultados: Record<string, string | null> = {}
    const feitas: string[] = []
    for (const a of m.acoes) {
      if (!a.ok || !m.marcadas?.[a.id]) continue
      const falha = await a.executar().catch(() => 'deu erro ao gravar')
      resultados[a.id] = falha
      if (!falha) feitas.push(a.resumo)
    }
    atualizar(m.id, { estado: 'confirmado', resultados })
    // a IA fica sabendo o que foi gravado para a próxima conversa
    nova({
      papel: 'assistente',
      texto: feitas.length ? (feitas.length === 1 ? 'Pronto, gravei 1 item.' : `Pronto, gravei ${feitas.length} itens.`) : 'Não consegui gravar nada.',
      paraIA: feitas.length ? `Feito. Gravei: ${feitas.join(' ')}` : 'Não consegui gravar nada.',
    })
    setExecutando(false)
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void enviar()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir o assistente"
        className="nao-imprimir fixed bottom-24 right-4 z-40 flex min-h-14 cursor-pointer items-center gap-2 rounded-full bg-azul px-5 text-sm font-medium text-superficie shadow-elevada transition-transform duration-300 hover:-translate-y-0.5 lg:bottom-6 lg:right-6"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" />
        </svg>
        Assistente
      </button>

      {aberto && (
        <div className="nao-imprimir fixed inset-0 z-50 flex justify-end bg-texto/30 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Assistente">
          <button className="hidden flex-1 cursor-default sm:block" aria-label="Fechar o assistente" onClick={() => setAberto(false)} />
          <section className="anim-gaveta flex h-full w-full flex-col bg-superficie shadow-elevada sm:max-w-md">
            <header className="flex items-center justify-between gap-2 border-b border-linha px-4 py-3">
              <div>
                <h2 className="font-titulo text-2xl font-semibold leading-none">Assistente</h2>
                <p className="text-xs text-texto-suave">Escreva o que precisa lançar. Eu preparo e você confirma.</p>
              </div>
              <div className="flex gap-2">
                {mensagens.length > 0 && (
                  <button className="min-h-11 cursor-pointer px-2 text-sm text-texto-suave underline" onClick={() => setMensagens([])}>
                    Limpar
                  </button>
                )}
                <button className={btnSecundario} onClick={() => setAberto(false)}>
                  Fechar
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
              {mensagens.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-texto-suave">Exemplos do que dá para pedir (toque para usar):</p>
                  <ul className="space-y-2">
                    {EXEMPLOS.map((x) => (
                      <li key={x}>
                        <button className="w-full cursor-pointer rounded-[14px] border border-linha bg-fundo px-3 py-2 text-left text-sm transition-colors hover:bg-areia" onClick={() => { setEntrada(x); campo.current?.focus() }}>
                          {x}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-texto-suave">Também: criar tarefa, anotar ideia, cadastrar gasto fixo e colocar valor em um evento.</p>
                </div>
              )}

              {mensagens.map((m) => (
                <div key={m.id} className={m.papel === 'usuario' ? 'flex justify-end' : ''}>
                  <div className={`max-w-[92%] space-y-3 rounded-[16px] px-3 py-2 text-sm ${m.papel === 'usuario' ? 'bg-azul text-superficie' : 'border border-linha bg-fundo'}`}>
                    {m.texto && <p className="whitespace-pre-wrap">{m.texto}</p>}
                    {m.acoes && (
                      <ul className="space-y-2">
                        {m.acoes.map((a) =>
                          a.ok ? (
                            <li key={a.id} className="flex items-start gap-2 rounded-md bg-superficie p-2 text-texto">
                              {m.estado === 'pendente' ? (
                                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={m.marcadas?.[a.id] ?? false} onChange={(e) => atualizar(m.id, { marcadas: { ...m.marcadas, [a.id]: e.target.checked } })} aria-label="Incluir esta ação" />
                              ) : (
                                <span aria-hidden className={`mt-0.5 shrink-0 ${m.resultados?.[a.id] === null ? 'text-musgo' : m.resultados?.[a.id] ? 'text-red-800' : 'text-texto-suave'}`}>
                                  {m.resultados?.[a.id] === null ? '✓' : m.resultados?.[a.id] ? '✗' : '–'}
                                </span>
                              )}
                              <span>
                                {a.resumo}
                                {m.resultados?.[a.id] && <strong className="block text-red-800">Erro: {m.resultados[a.id]}</strong>}
                              </span>
                            </li>
                          ) : (
                            <li key={a.id} className="rounded-md border border-mostarda bg-mostarda/40 p-2 text-texto">Não consegui preparar uma das ações: {a.motivo}.</li>
                          ),
                        )}
                      </ul>
                    )}
                    {m.estado === 'pendente' && (
                      <div className="flex flex-wrap gap-2">
                        <button className={btnPrimario} disabled={executando || !Object.values(m.marcadas ?? {}).some(Boolean)} onClick={() => void confirmar(m)}>
                          {executando ? 'Gravando…' : 'Confirmar'}
                        </button>
                        <button className={btnSecundario} disabled={executando} onClick={() => atualizar(m.id, { estado: 'cancelado' })}>
                          Cancelar
                        </button>
                      </div>
                    )}
                    {m.estado === 'cancelado' && <p className="text-xs text-texto-suave">Cancelado. Nada foi gravado.</p>}
                  </div>
                </div>
              ))}
              {pensando && <p className="anim-respirar text-sm text-texto-suave">Pensando…</p>}
              <div ref={fim} />
            </div>

            <form onSubmit={enviar} className="flex items-end gap-2 border-t border-linha p-3">
              <textarea
                ref={campo}
                aria-label="Mensagem para o assistente"
                className="max-h-40 min-h-12 flex-1 resize-none rounded-[14px] border border-linha bg-fundo px-3 py-3 text-sm"
                rows={2}
                maxLength={6000}
                placeholder="Ex.: gastei 60 no Canva"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={aoTeclar}
              />
              <button className={btnPrimario} disabled={pensando || !entrada.trim()}>
                Enviar
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
