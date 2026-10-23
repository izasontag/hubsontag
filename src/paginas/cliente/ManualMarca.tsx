import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, Campo, Cartao, inputCls } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import { CAPITULOS } from '../../lib/tipos'
import type { ChaveCapitulo, Cliente } from '../../lib/tipos'
import Metas from './Metas'
import PromptsSkills from './PromptsSkills'

type Textos = Record<ChaveCapitulo, string>

const vazio = Object.fromEntries(CAPITULOS.map((c) => [c.chave, ''])) as Textos

export default function ManualMarca({ cliente }: { cliente: Cliente }) {
  const [textos, setTextos] = useState<Textos | null>(null)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    supabase
      .from('manual_marca')
      .select('*')
      .eq('cliente_id', cliente.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setErro('Não foi possível carregar o manual.')
        const lido = { ...vazio }
        for (const c of CAPITULOS) lido[c.chave] = (data?.[c.chave] as string | null) ?? ''
        setTextos(lido)
      })
  }, [cliente.id])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!textos) return
    setErro('')
    setOk(false)
    setSalvando(true)
    const { error } = await supabase
      .from('manual_marca')
      .upsert({ cliente_id: cliente.id, ...textos }, { onConflict: 'cliente_id' })
    setSalvando(false)
    if (error) setErro('Não foi possível salvar o manual.')
    else setOk(true)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="space-y-6">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {!textos && !erro && <p className="text-texto-suave">Carregando...</p>}
        {textos &&
          CAPITULOS.map((c, i) => (
            <Cartao key={c.chave}>
              <h2 className="font-titulo text-2xl font-semibold" style={{ color: cliente.cor_destaque }}>
                {i + 1}. {c.titulo}
              </h2>
              <p className="mb-3 text-sm text-texto-suave">{c.dica}</p>
              <Campo rotulo={`Texto de ${c.titulo.toLowerCase()}`}>
                <textarea
                  rows={6}
                  className={inputCls}
                  value={textos[c.chave]}
                  onChange={(e) => {
                    setOk(false)
                    setTextos({ ...textos, [c.chave]: e.target.value })
                  }}
                />
              </Campo>
            </Cartao>
          ))}
        {textos && (
          <div className="space-y-3">
            <button type="submit" disabled={salvando} className={btnPrimario}>
              {salvando ? 'Salvando...' : 'Salvar manual'}
            </button>
            {ok && <Aviso tipo="ok">Manual salvo.</Aviso>}
          </div>
        )}
      </form>
      <Metas clienteId={cliente.id} />
      <PromptsSkills cliente={cliente} />
    </div>
  )
}
