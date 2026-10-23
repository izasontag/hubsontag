import { useState } from 'react'
import { Aviso, btnSecundario, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Cliente } from '../../lib/tipos'

const novoToken = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')

export default function LinkPortal({
  cliente,
  onChange,
}: {
  cliente: Cliente
  onChange: (c: Cliente) => void
}) {
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const link = `${window.location.origin}/portal/${cliente.token_portal}`

  async function atualizar(campos: Partial<Cliente>, sucesso: string) {
    setMsg('')
    setErro('')
    const { data, error } = await supabase
      .from('clientes')
      .update(campos)
      .eq('id', cliente.id)
      .select()
      .single()
    if (error || !data) {
      setErro('Não foi possível atualizar o link.')
      return
    }
    onChange(data as Cliente)
    setMsg(sucesso)
  }

  async function copiar() {
    setMsg('')
    setErro('')
    try {
      await navigator.clipboard.writeText(link)
      setMsg('Link copiado.')
    } catch {
      setErro('Não deu para copiar sozinho. Selecione o link e copie.')
    }
  }

  function trocar() {
    if (!window.confirm('Trocar o link? O link antigo deixa de funcionar e o cliente precisa receber o novo.')) return
    void atualizar({ token_portal: novoToken() }, 'Link trocado. Envie o novo link ao cliente.')
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Portal do cliente</Titulo>
      <p className="text-sm text-texto-suave">
        Link secreto para o cliente ver o que é dele, sem criar conta. As páginas do portal chegam na
        Fase 3; o link já fica reservado.
      </p>
      <input readOnly className={inputCls} value={link} onFocus={(e) => e.target.select()} aria-label="Link do portal" />
      <div className="flex flex-wrap gap-3">
        <button className={btnSecundario} onClick={() => void copiar()}>
          Copiar link
        </button>
        <button
          className={btnSecundario}
          onClick={() =>
            void atualizar(
              { portal_ativo: !cliente.portal_ativo },
              cliente.portal_ativo ? 'Portal desativado.' : 'Portal ativado.',
            )
          }
        >
          {cliente.portal_ativo ? 'Desativar portal' : 'Ativar portal'}
        </button>
        <button className={btnSecundario} onClick={trocar}>
          Trocar link
        </button>
      </div>
      <p className="text-sm">Situação: {cliente.portal_ativo ? 'ativo' : 'desativado'}</p>
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}
