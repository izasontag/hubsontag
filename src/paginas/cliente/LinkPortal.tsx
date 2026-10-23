import { useState } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
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
  const [recado, setRecado] = useState(cliente.recado_portal ?? '')
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
      setErro('Não foi possível atualizar.')
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
      setMsg('Link copiado. Agora é só enviar ao cliente.')
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
        Link secreto para o cliente ver o que é dele, aprovar posts e comentar, sem criar conta. Quem tiver o link
        acessa, então envie só ao cliente.
      </p>
      <input readOnly className={inputCls} value={link} onFocus={(e) => e.target.select()} aria-label="Link do portal" />
      <div className="flex flex-wrap gap-3">
        <button className={btnPrimario} onClick={() => void copiar()}>
          Copiar link
        </button>
        <a className={btnSecundario} href={link} target="_blank" rel="noreferrer">
          Abrir o portal
        </a>
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
      <p className="text-sm">Situação: {cliente.portal_ativo ? 'ativo' : 'desativado (o link não abre)'}</p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          void atualizar({ recado_portal: recado.trim() || null }, 'Recado salvo.')
        }}
      >
        <Campo rotulo="Recado no início do portal (opcional)">
          <textarea rows={3} className={inputCls} value={recado} onChange={(e) => setRecado(e.target.value)} />
        </Campo>
        <button type="submit" className={btnSecundario}>
          Salvar recado
        </button>
      </form>
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}
