import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Meta } from '../../lib/tipos'

export default function Metas({ clienteId }: { clienteId: string }) {
  const [metas, setMetas] = useState<Meta[]>([])
  const [nome, setNome] = useState('')
  const [valorMeta, setValorMeta] = useState('')
  const [prazo, setPrazo] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('metas').select('*').eq('cliente_id', clienteId).order('criado_em')
    setMetas((data as Meta[]) ?? [])
  }, [clienteId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase.from('metas').insert({
      cliente_id: clienteId,
      nome: nome.trim(),
      valor_meta: Number(valorMeta) || 0,
      prazo: prazo || null,
    })
    if (error) return setErro('Não foi possível salvar a meta.')
    setNome('')
    setValorMeta('')
    setPrazo('')
    void carregar()
  }

  async function atualizarValor(meta: Meta, texto: string) {
    const valor = Number(texto)
    if (Number.isNaN(valor) || valor === meta.valor_atual) return
    const { error } = await supabase.from('metas').update({ valor_atual: valor }).eq('id', meta.id)
    if (error) setErro('Não foi possível atualizar a meta.')
    void carregar()
  }

  async function remover(id: string) {
    if (!window.confirm('Remover esta meta?')) return
    await supabase.from('metas').delete().eq('id', id)
    void carregar()
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Metas</Titulo>
      {metas.length === 0 && <p className="text-sm text-texto-suave">Nenhuma meta ainda.</p>}
      <ul className="space-y-4">
        {metas.map((m) => {
          const pct = m.valor_meta > 0 ? Math.min(100, Math.round((m.valor_atual / m.valor_meta) * 100)) : 0
          return (
            <li key={m.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {m.nome}
                  {m.prazo && <span className="text-sm font-normal text-texto-suave"> · até {formatarData(m.prazo)}</span>}
                </p>
                <button className={btnSecundario} onClick={() => void remover(m.id)}>
                  Remover
                </button>
              </div>
              <div className="h-2 rounded-sm bg-linha" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.nome}: ${pct}%`}>
                <div className="anim-crescer h-2 rounded-sm bg-musgo" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
                <label className="flex items-center gap-2">
                  Valor atual
                  <input
                    type="number"
                    step="any"
                    defaultValue={m.valor_atual}
                    key={`${m.id}-${m.valor_atual}`}
                    onBlur={(e) => void atualizarValor(m, e.target.value)}
                    className={`${inputCls} w-32`}
                  />
                </label>
                <span>
                  de {m.valor_meta} ({pct}%)
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <form onSubmit={adicionar} className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Nome da meta">
          <input required className={inputCls} placeholder="Seguidores, leads..." value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Valor da meta">
          <input type="number" step="any" required className={inputCls} value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} />
        </Campo>
        <Campo rotulo="Prazo">
          <input type="date" className={inputCls} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
        <div className="sm:col-span-3">
          <button type="submit" className={btnPrimario}>
            Adicionar meta
          </button>
        </div>
      </form>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}
