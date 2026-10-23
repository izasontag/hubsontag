import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChipTag } from '../../componentes/Selos'
import { Aviso, btnPrimario, Campo, inputCls } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Tag } from '../../lib/tipos'

interface Props {
  clienteId: string
  tags: Tag[]
  dona: boolean
  onMudou: () => void
}

export default function GerenciarTags({ clienteId, tags, dona, onMudou }: Props) {
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#5C6B47')
  const [geral, setGeral] = useState(false)
  const [erro, setErro] = useState('')

  const visiveis = tags.filter((t) => t.cliente_id === null || t.cliente_id === clienteId)

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase
      .from('tags')
      .insert({ nome: nome.trim(), cor, cliente_id: geral && dona ? null : clienteId })
    if (error) return setErro('Não foi possível criar a tag.')
    setNome('')
    onMudou()
  }

  async function remover(t: Tag) {
    if (!window.confirm(`Apagar a tag "${t.nome}"? Ela sai de todos os posts.`)) return
    const { error } = await supabase.from('tags').delete().eq('id', t.id)
    if (error) return setErro('Não foi possível apagar a tag.')
    onMudou()
  }

  return (
    <details className="rounded-md border border-linha bg-superficie p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-titulo text-xl font-semibold text-marrom">Tags</summary>
      <div className="mt-2 space-y-4">
        {visiveis.length === 0 && <p className="text-sm text-texto-suave">Nenhuma tag ainda.</p>}
        <ul className="flex flex-wrap gap-2">
          {visiveis.map((t) => (
            <li key={t.id} className="flex items-center gap-1">
              <ChipTag tag={t} />
              {t.cliente_id === null && <span className="text-xs text-texto-suave">(geral)</span>}
              {(t.cliente_id !== null || dona) && (
                <button type="button" onClick={() => void remover(t)} aria-label={`Apagar tag ${t.nome}`} className="h-11 w-11 cursor-pointer text-texto-suave hover:text-marrom">
                  &times;
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={adicionar} className="grid items-end gap-3 sm:grid-cols-[1fr_6rem_auto]">
          <Campo rotulo="Nome da tag">
            <input required className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Cor">
            <input type="color" className={`${inputCls} cursor-pointer p-1`} value={cor} onChange={(e) => setCor(e.target.value)} />
          </Campo>
          <button type="submit" className={btnPrimario}>
            Criar tag
          </button>
          {dona && (
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-3">
              <input type="checkbox" checked={geral} onChange={(e) => setGeral(e.target.checked)} className="h-5 w-5" />
              Tag geral (aparece para todos os clientes)
            </label>
          )}
        </form>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </div>
    </details>
  )
}
