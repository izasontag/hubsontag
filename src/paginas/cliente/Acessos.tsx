import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Acesso } from '../../lib/tipos'

export default function Acessos({ clienteId }: { clienteId: string }) {
  const [itens, setItens] = useState<Acesso[]>([])
  const [servico, setServico] = useState('')
  const [link, setLink] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('acessos_cliente')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('criado_em')
    setItens((data as Acesso[]) ?? [])
  }, [clienteId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase.from('acessos_cliente').insert({
      cliente_id: clienteId,
      servico: servico.trim(),
      link: link.trim() || null,
      observacao: observacao.trim() || null,
    })
    if (error) return setErro('Não foi possível salvar o acesso.')
    setServico('')
    setLink('')
    setObservacao('')
    void carregar()
  }

  async function remover(id: string) {
    if (!window.confirm('Remover este acesso?')) return
    await supabase.from('acessos_cliente').delete().eq('id', id)
    void carregar()
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Acessos</Titulo>
      <p className="text-sm text-texto-suave">
        Só você vê esta parte. Guarde aqui links e onde ficam as credenciais, nunca as senhas em si.
      </p>
      <ul className="divide-y divide-linha">
        {itens.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-medium">{a.servico}</p>
              {a.link && (
                <a href={a.link} target="_blank" rel="noreferrer" className="text-sm text-musgo underline">
                  {a.link}
                </a>
              )}
              {a.observacao && <p className="text-sm text-texto-suave">{a.observacao}</p>}
            </div>
            <button className={btnSecundario} onClick={() => void remover(a.id)}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Serviço">
          <input required className={inputCls} placeholder="Instagram, Drive..." value={servico} onChange={(e) => setServico(e.target.value)} />
        </Campo>
        <Campo rotulo="Link">
          <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} />
        </Campo>
        <Campo rotulo="Observação">
          <input className={inputCls} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Campo>
        <div className="sm:col-span-3">
          <button type="submit" className={btnPrimario}>
            Adicionar acesso
          </button>
        </div>
      </form>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}
