import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Historico as Registro, TipoHistorico } from '../../lib/tipos'

const ROTULO: Record<TipoHistorico, string> = {
  reuniao: 'Reunião',
  decisao: 'Decisão',
  feedback: 'Feedback',
}

const hoje = () => new Date().toLocaleDateString('sv-SE')

export default function Historico({ clienteId }: { clienteId: string }) {
  const [itens, setItens] = useState<Registro[]>([])
  const [tipo, setTipo] = useState<TipoHistorico>('reuniao')
  const [data, setData] = useState(hoje())
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data: linhas } = await supabase
      .from('historico_cliente')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
    setItens((linhas as Registro[]) ?? [])
  }, [clienteId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase
      .from('historico_cliente')
      .insert({ cliente_id: clienteId, tipo, data, texto: texto.trim() })
    if (error) return setErro('Não foi possível salvar o registro.')
    setTexto('')
    void carregar()
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Histórico</Titulo>
      <form onSubmit={adicionar} className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr]">
        <Campo rotulo="Tipo">
          <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoHistorico)}>
            {Object.entries(ROTULO).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Data">
          <input type="date" required className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
        <Campo rotulo="O que aconteceu">
          <textarea required rows={2} className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
        <div className="sm:col-span-3">
          <button type="submit" className={btnPrimario}>
            Adicionar ao histórico
          </button>
        </div>
      </form>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {itens.length === 0 && <p className="text-sm text-texto-suave">Nenhum registro ainda.</p>}
      <ul className="divide-y divide-linha">
        {itens.map((h) => (
          <li key={h.id} className="py-3">
            <p className="text-sm text-texto-suave">
              {formatarData(h.data)} · {ROTULO[h.tipo]}
            </p>
            <p className="whitespace-pre-wrap">{h.texto}</p>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}
