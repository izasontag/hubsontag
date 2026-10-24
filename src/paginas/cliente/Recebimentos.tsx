import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import NumInput from '../../componentes/NumInput'
import { dataDeHoje, nomeDoMes } from '../../lib/datas'
import { reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { FORMA_ROTULO, FORMAS_PAGAMENTO } from '../../lib/tipos'
import type { Cliente, Cobranca, FormaPagamento } from '../../lib/tipos'

const LIMITE_NOTA = 20 * 1024 * 1024

type Situacao = 'recebido' | 'parcial' | 'atrasado' | 'a_receber'
const ROTULO: Record<Situacao, string> = { recebido: 'Recebido', parcial: 'Recebido em parte', atrasado: 'Atrasado', a_receber: 'A receber' }
const COR: Record<Situacao, string> = {
  recebido: 'border-musgo bg-musgo-claro text-musgo',
  parcial: 'border-mostarda bg-mostarda/60 text-marrom-escuro',
  atrasado: 'border-red-800 bg-red-50 text-red-800',
  a_receber: 'border-linha bg-areia text-texto-suave',
}

const situacaoDe = (c: Cobranca, hoje: string): Situacao => {
  if (c.status === 'pago') return c.valor_recebido !== null && Number(c.valor_recebido) < Number(c.valor) ? 'parcial' : 'recebido'
  return c.vencimento < hoje ? 'atrasado' : 'a_receber'
}

interface Pagando {
  id: string
  data: string
  valor: number
  forma: FormaPagamento | ''
}

// Aba "Recebimentos" do cliente (só a dona): o que já entrou em cada mês e a nota de cada pagamento.
export default function Recebimentos({ cliente }: { cliente: Cliente }) {
  const hoje = dataDeHoje()
  const [lista, setLista] = useState<Cobranca[] | null>(null)
  const [pagando, setPagando] = useState<Pagando | null>(null)
  const [nova, setNova] = useState<{ descricao: string; vencimento: string; valor: number } | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('cobrancas').select('*').eq('cliente_id', cliente.id).order('vencimento', { ascending: false })
    if (error) return setErro('Não foi possível carregar os recebimentos.')
    setLista(data as Cobranca[])
  }, [cliente.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function marcarRecebido(e: FormEvent) {
    e.preventDefault()
    if (!pagando) return
    setErro('')
    const { error } = await supabase
      .from('cobrancas')
      .update({ status: 'pago', pago_em: pagando.data, valor_recebido: pagando.valor, forma_pagamento: pagando.forma || null })
      .eq('id', pagando.id)
    if (error) return setErro('Não foi possível registrar o recebimento.')
    setPagando(null)
    setMsg('Recebimento registrado.')
    void carregar()
  }

  async function desfazer(c: Cobranca) {
    setErro('')
    const { error } = await supabase
      .from('cobrancas')
      .update({ status: c.vencimento < hoje ? 'atrasado' : 'a_vencer', pago_em: null, valor_recebido: null })
      .eq('id', c.id)
    if (error) return setErro('Não foi possível desfazer.')
    void carregar()
  }

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!nova) return
    setErro('')
    const { error } = await supabase.from('cobrancas').insert({ cliente_id: cliente.id, descricao: nova.descricao.trim(), vencimento: nova.vencimento, valor: nova.valor })
    if (error) return setErro('Não foi possível criar a cobrança do mês.')
    setNova(null)
    void carregar()
  }

  async function subirNota(c: Cobranca, arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    setMsg('')
    if (arquivo.size > LIMITE_NOTA) return setErro('A nota passa de 20 MB.')
    const extensao = (arquivo.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
    const caminho = `${cliente.id}/${c.id}/${crypto.randomUUID()}.${extensao}`
    const envio = await supabase.storage.from('notas').upload(caminho, arquivo, { contentType: arquivo.type || undefined })
    if (envio.error) return setErro('Não foi possível enviar a nota. Confira se o arquivo 014_recebimentos_notas.sql foi rodado no Supabase.')
    const { error } = await supabase.from('cobrancas').update({ nota_storage: caminho, nota_nome: arquivo.name }).eq('id', c.id)
    if (error) {
      await supabase.storage.from('notas').remove([caminho])
      return setErro('Não foi possível anexar a nota.')
    }
    if (c.nota_storage) await supabase.storage.from('notas').remove([c.nota_storage])
    setMsg('Nota anexada.')
    void carregar()
  }

  async function abrirNota(c: Cobranca) {
    if (!c.nota_storage) return
    const { data, error } = await supabase.storage.from('notas').createSignedUrl(c.nota_storage, 300)
    if (error || !data) return setErro('Não foi possível abrir a nota.')
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function removerNota(c: Cobranca) {
    if (!c.nota_storage || !window.confirm('Remover a nota anexada?')) return
    await supabase.storage.from('notas').remove([c.nota_storage])
    await supabase.from('cobrancas').update({ nota_storage: null, nota_nome: null }).eq('id', c.id)
    void carregar()
  }

  const mesAtual = hoje.slice(0, 7)
  const doMes = (lista ?? []).filter((c) => c.vencimento.startsWith(mesAtual))
  const previstoMes = soma(doMes, (c) => Number(c.valor))
  const recebidoMes = soma(doMes.filter((c) => c.status === 'pago'), (c) => Number(c.valor_recebido ?? c.valor))
  const meses = [...new Set((lista ?? []).map((c) => c.vencimento.slice(0, 7)))]
  const totalAno = soma((lista ?? []).filter((c) => c.status === 'pago' && c.pago_em?.startsWith(hoje.slice(0, 4))), (c) => Number(c.valor_recebido ?? c.valor))
  const semNota = (lista ?? []).filter((c) => c.status === 'pago' && !c.nota_storage).length

  return (
    <div className="space-y-6">
      <Cartao className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{nomeDoMes(mesAtual)}</p>
            <p className="numeros-grandes mt-1 text-4xl">{reais(recebidoMes)}<span className="ml-2 text-base text-texto-suave">recebidos de {reais(previstoMes)}</span></p>
          </div>
          <button className={btnPrimario} onClick={() => setNova({ descricao: `Mensalidade de ${nomeDoMes(mesAtual)}`, vencimento: hoje, valor: 0 })}>
            Nova cobrança do mês
          </button>
        </div>
        {previstoMes > 0 && (
          <div className="h-2 rounded-full bg-areia" role="progressbar" aria-valuenow={Math.round((recebidoMes / previstoMes) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Quanto do mês já foi recebido">
            <div className="anim-crescer h-2 rounded-full bg-musgo" style={{ width: `${Math.min(100, (recebidoMes / previstoMes) * 100)}%` }} />
          </div>
        )}
        <p className="text-sm text-texto-suave">
          Neste ano: <strong>{reais(totalAno)}</strong> recebidos
          {semNota > 0 && <> · <strong>{semNota}</strong> {semNota === 1 ? 'pagamento sem nota anexada' : 'pagamentos sem nota anexada'}</>}
        </p>
      </Cartao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      {nova && (
        <Cartao>
          <form onSubmit={criar} className="space-y-4">
            <Titulo>Nova cobrança</Titulo>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Descrição"><input required className={inputCls} value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} /></Campo>
              <Campo rotulo="Vencimento"><input type="date" required className={inputCls} value={nova.vencimento} onChange={(e) => setNova({ ...nova, vencimento: e.target.value })} /></Campo>
              <Campo rotulo="Valor (R$)"><NumInput rotulo="Valor da cobrança" valor={nova.valor} onChange={(n) => setNova({ ...nova, valor: n })} /></Campo>
            </div>
            <div className="flex gap-3">
              <button className={btnPrimario}>Criar</button>
              <button type="button" className={btnSecundario} onClick={() => setNova(null)}>Cancelar</button>
            </div>
          </form>
        </Cartao>
      )}

      {lista?.length === 0 && !nova && <p className="text-texto-suave">Nenhuma cobrança deste cliente ainda. Crie a do mês acima, ou gere pelas mensalidades do contrato em Financeiro.</p>}

      {meses.map((m) => (
        <section key={m} className="space-y-3" aria-label={nomeDoMes(m)}>
          <h3 className="titulo-sub capitalize">{nomeDoMes(m)}</h3>
          <ul className="space-y-3">
            {(lista ?? []).filter((c) => c.vencimento.startsWith(m)).map((c) => {
              const sit = situacaoDe(c, hoje)
              const falta = c.status === 'pago' ? Number(c.valor) - Number(c.valor_recebido ?? c.valor) : 0
              return (
                <li key={c.id} className="space-y-3 rounded-[14px] border border-linha bg-superficie p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{c.descricao}</p>
                      <p className="text-sm text-texto-suave">
                        Vence em {formatarData(c.vencimento)}
                        {c.pago_em && ` · recebido em ${formatarData(c.pago_em)}`}
                        {c.forma_pagamento && ` · ${FORMA_ROTULO[c.forma_pagamento]}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="numeros-grandes text-xl">{reais(Number(c.status === 'pago' ? (c.valor_recebido ?? c.valor) : c.valor))}</p>
                      <span className={`mt-1 inline-block rounded-full border px-3 py-0.5 text-xs ${COR[sit]}`}>{ROTULO[sit]}</span>
                    </div>
                  </div>
                  {falta > 0 && <p className="text-sm text-texto-suave">Faltam {reais(falta)} dos {reais(Number(c.valor))} combinados.</p>}

                  {pagando?.id === c.id ? (
                    <form onSubmit={marcarRecebido} className="grid gap-3 rounded-md bg-areia p-3 sm:grid-cols-4 sm:items-end">
                      <Campo rotulo="Quanto recebeu (R$)"><NumInput rotulo="Valor recebido" valor={pagando.valor} onChange={(n) => setPagando({ ...pagando, valor: n })} /></Campo>
                      <Campo rotulo="Data"><input type="date" required className={inputCls} value={pagando.data} max={hoje} onChange={(e) => setPagando({ ...pagando, data: e.target.value })} /></Campo>
                      <Campo rotulo="Forma">
                        <select className={inputCls} value={pagando.forma} onChange={(e) => setPagando({ ...pagando, forma: e.target.value as FormaPagamento | '' })}>
                          <option value="">Não informar</option>
                          {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{FORMA_ROTULO[f]}</option>)}
                        </select>
                      </Campo>
                      <div className="flex gap-2">
                        <button className={btnPrimario}>Confirmar</button>
                        <button type="button" className={btnSecundario} onClick={() => setPagando(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {c.status !== 'pago' ? (
                        <button className={btnPrimario} onClick={() => setPagando({ id: c.id, data: hoje, valor: Number(c.valor), forma: '' })}>Marcar como recebido</button>
                      ) : (
                        <button className={btnSecundario} onClick={() => void desfazer(c)}>Desfazer recebimento</button>
                      )}
                      {c.nota_storage && <button className={btnSecundario} onClick={() => void abrirNota(c)}>Ver nota{c.nota_nome ? ` (${c.nota_nome})` : ''}</button>}
                      <label className={`${btnSecundario} cursor-pointer`}>
                        {c.nota_storage ? 'Trocar nota' : 'Subir nota'}
                        <input type="file" accept="application/pdf,image/*,.xml" className="sr-only" aria-label={`Arquivo da nota de ${c.descricao}`} onChange={(e) => { void subirNota(c, e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                      {c.nota_storage && <button className="min-h-11 cursor-pointer px-2 text-sm text-red-800 underline" onClick={() => void removerNota(c)}>Remover nota</button>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
