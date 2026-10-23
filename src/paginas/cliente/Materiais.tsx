import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'

interface Material {
  id: string
  titulo: string
  tipo: 'briefing' | 'contrato' | 'identidade' | 'documento'
  link: string | null
}

const ROTULO = { briefing: 'Briefing', contrato: 'Contrato', identidade: 'Identidade', documento: 'Documento' }

export default function Materiais({ clienteId }: { clienteId: string }) {
  const [itens, setItens] = useState<Material[]>([])
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<Material['tipo']>('documento')
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('materiais').select('*').eq('cliente_id', clienteId).order('criado_em')
    setItens((data as Material[]) ?? [])
  }, [clienteId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const endereco = link.trim()
    if (!/^https?:\/\//i.test(endereco)) return setErro('O link precisa começar com http:// ou https://')
    const { error } = await supabase.from('materiais').insert({ cliente_id: clienteId, titulo: titulo.trim(), tipo, link: endereco })
    if (error) return setErro('Não foi possível salvar o material.')
    setTitulo('')
    setLink('')
    void carregar()
  }

  async function remover(id: string) {
    if (!window.confirm('Remover este material?')) return
    await supabase.from('materiais').delete().eq('id', id)
    void carregar()
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Materiais para o cliente</Titulo>
      <p className="text-sm text-texto-suave">
        Links (Google Drive, Notion...) que o cliente vê na página Materiais do portal. Não coloque nada que ele não deva ver.
      </p>
      <ul className="divide-y divide-linha">
        {itens.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>
              {m.titulo} <span className="text-sm text-texto-suave">· {ROTULO[m.tipo]}</span>
              {m.link && (
                <a href={m.link} target="_blank" rel="noreferrer" className="block break-all text-sm text-musgo underline">
                  {m.link}
                </a>
              )}
            </span>
            <button className={btnSecundario} onClick={() => void remover(m.id)}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Título">
          <input required className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo rotulo="Tipo">
          <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as Material['tipo'])}>
            {Object.entries(ROTULO).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Link">
          <input required className={inputCls} placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
        </Campo>
        <div className="sm:col-span-3">
          <button type="submit" className={btnPrimario}>
            Adicionar material
          </button>
        </div>
      </form>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}
