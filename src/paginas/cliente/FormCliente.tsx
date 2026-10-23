import { useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, Campo, inputCls } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Cliente, StatusCliente } from '../../lib/tipos'

interface Props {
  inicial?: Cliente
  somenteLeitura?: boolean
  onSalvo: (cliente: Cliente) => void
}

const vazioParaNulo = (v: string) => (v.trim() === '' ? null : v.trim())

export default function FormCliente({ inicial, somenteLeitura = false, onSalvo }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [instagram, setInstagram] = useState(inicial?.instagram ?? '')
  const [nicho, setNicho] = useState(inicial?.nicho ?? '')
  const [contato, setContato] = useState(inicial?.contato ?? '')
  const [status, setStatus] = useState<StatusCliente>(inicial?.status ?? 'ativo')
  const [dataInicio, setDataInicio] = useState(inicial?.data_inicio ?? '')
  const [cor, setCor] = useState(inicial?.cor_destaque ?? '#5C6B47')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [objetivo, setObjetivo] = useState(inicial?.objetivo ?? '')
  const [suporte, setSuporte] = useState(inicial?.suporte ?? '')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk(false)
    setSalvando(true)
    const dados = {
      nome: nome.trim(),
      instagram: vazioParaNulo(instagram),
      nicho: vazioParaNulo(nicho),
      contato: vazioParaNulo(contato),
      status,
      data_inicio: dataInicio || null,
      cor_destaque: cor,
      observacoes: vazioParaNulo(observacoes),
      objetivo: vazioParaNulo(objetivo),
      suporte: vazioParaNulo(suporte),
    }
    const consulta = inicial
      ? supabase.from('clientes').update(dados).eq('id', inicial.id)
      : supabase.from('clientes').insert(dados)
    const { data, error } = await consulta.select().single()
    setSalvando(false)
    if (error || !data) {
      setErro('Não foi possível salvar. Confira os dados e tente de novo.')
      return
    }
    setOk(true)
    onSalvo(data as Cliente)
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <fieldset disabled={somenteLeitura} className="space-y-4">
        <Campo rotulo="Nome do cliente">
          <input required className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Instagram">
            <input
              className={inputCls}
              placeholder="@perfil"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Nicho">
            <input className={inputCls} value={nicho} onChange={(e) => setNicho(e.target.value)} />
          </Campo>
          <Campo rotulo="Contato (telefone ou e-mail)">
            <input className={inputCls} value={contato} onChange={(e) => setContato(e.target.value)} />
          </Campo>
          <Campo rotulo="Status">
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusCliente)}
            >
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Campo>
          <Campo rotulo="Início do contrato">
            <input
              type="date"
              className={inputCls}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Cor de destaque do cliente">
            <input
              type="color"
              className={`${inputCls} cursor-pointer p-1`}
              value={cor}
              onChange={(e) => setCor(e.target.value)}
            />
          </Campo>
        </div>
        <Campo rotulo="Objetivo do cliente (aparece no início do portal)">
          <textarea rows={2} className={inputCls} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
        </Campo>
        <Campo rotulo="Horário de suporte e WhatsApp (aparece no início do portal)">
          <input className={inputCls} placeholder="Segunda a sexta, 8h às 18h. WhatsApp (67) 9...." value={suporte} onChange={(e) => setSuporte(e.target.value)} />
        </Campo>
        <Campo rotulo="Observações (só interno)">
          <textarea
            rows={4}
            className={inputCls}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </Campo>
      </fieldset>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && <Aviso tipo="ok">Salvo.</Aviso>}
      {!somenteLeitura && (
        <button type="submit" disabled={salvando} className={btnPrimario}>
          {salvando ? 'Salvando...' : inicial ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>
      )}
    </form>
  )
}
