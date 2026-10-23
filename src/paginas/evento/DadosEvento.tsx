import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { CATEGORIAS_EVENTO, STATUS_EVENTO, STATUS_EVENTO_ROTULO } from '../../lib/tipos'
import type { Evento, StatusEvento } from '../../lib/tipos'

const LIMITE = 50 * 1024 * 1024

export default function DadosEvento({ evento, onChange }: { evento: Evento; onChange: (e: Evento) => void }) {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [nome, setNome] = useState(evento.nome)
  const [categoria, setCategoria] = useState(evento.categoria ?? (evento.tipo === 'casamento' ? 'Casamento' : 'Evento'))
  const [data, setData] = useState(evento.data_evento)
  const [horario, setHorario] = useState(evento.horario?.slice(0, 5) ?? '')
  const [local, setLocal] = useState(evento.local ?? '')
  const [contato, setContato] = useState(evento.contato ?? '')
  const [status, setStatus] = useState<StatusEvento>(evento.status)
  const [observacoes, setObservacoes] = useState(evento.observacoes ?? '')
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk(false)
    const { data: salvo, error } = await supabase
      .from('eventos')
      .update({
        nome: nome.trim(),
        tipo: categoria.trim().toLowerCase() === 'casamento' ? 'casamento' : 'evento',
        categoria: categoria.trim(),
        data_evento: data,
        horario: horario || null,
        local: local.trim() || null,
        contato: contato.trim() || null,
        status,
        observacoes: observacoes.trim() || null,
      })
      .eq('id', evento.id)
      .select()
      .single()
    if (error || !salvo) return setErro('Não foi possível salvar.')
    onChange(salvo as Evento)
    setOk(true)
  }

  async function anexar(arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    if (arquivo.size > LIMITE) return setErro('O arquivo passa de 50 MB.')
    const extensao = (arquivo.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
    const caminho = `${evento.id}/${crypto.randomUUID()}.${extensao}`
    const envio = await supabase.storage.from('eventos').upload(caminho, arquivo, { contentType: arquivo.type || undefined })
    if (envio.error) return setErro('Não foi possível enviar o contrato.')
    const { data: salvo, error } = await supabase.from('eventos').update({ contrato_storage: caminho }).eq('id', evento.id).select().single()
    if (error || !salvo) {
      await supabase.storage.from('eventos').remove([caminho])
      return setErro('Não foi possível registrar o contrato.')
    }
    if (evento.contrato_storage) await supabase.storage.from('eventos').remove([evento.contrato_storage])
    onChange(salvo as Evento)
  }

  async function abrir() {
    if (!evento.contrato_storage) return
    const { data: link } = await supabase.storage.from('eventos').createSignedUrl(evento.contrato_storage, 300)
    if (link?.signedUrl) window.open(link.signedUrl, '_blank', 'noopener')
    else setErro('Não foi possível abrir o contrato.')
  }

  async function apagar() {
    if (!window.confirm('Apagar este evento, o checklist e as parcelas? Não dá para desfazer.')) return
    if (evento.contrato_storage) await supabase.storage.from('eventos').remove([evento.contrato_storage])
    const { error } = await supabase.from('eventos').delete().eq('id', evento.id)
    if (error) return setErro('Não foi possível apagar o evento.')
    navegar('/app/eventos')
  }

  return (
    <div className="space-y-6">
      <Cartao>
        <form onSubmit={salvar} className="space-y-4">
          <Titulo>Dados do evento</Titulo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome do evento ou do cliente">
              <input required className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
<Campo rotulo="Que tipo de evento é?">
            <input required list="tipos-evento" maxLength={60} className={inputCls} value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Casamento, aniversário, formatura..." />
              <datalist id="tipos-evento">
                {CATEGORIAS_EVENTO.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              </Campo>
            <Campo rotulo="Data do evento">
              <input type="date" required className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo rotulo="Horário">
              <input type="time" className={inputCls} value={horario} onChange={(e) => setHorario(e.target.value)} />
            </Campo>
            <Campo rotulo="Local">
              <input className={inputCls} value={local} onChange={(e) => setLocal(e.target.value)} />
            </Campo>
            <Campo rotulo="Contato">
              <input className={inputCls} value={contato} onChange={(e) => setContato(e.target.value)} />
            </Campo>
            <Campo rotulo="Situação">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as StatusEvento)}>
                {STATUS_EVENTO.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_EVENTO_ROTULO[s]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Observações">
            <textarea rows={4} className={inputCls} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </Campo>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {ok && <Aviso tipo="ok">Salvo.</Aviso>}
          <button type="submit" className={btnPrimario}>
            Salvar alterações
          </button>
        </form>
      </Cartao>

      <Cartao className="space-y-3">
        <Titulo>Contrato</Titulo>
        <p className="text-sm text-texto-suave">Arquivo guardado em um espaço privado. Só você e a equipe atribuída a este evento conseguem abrir.</p>
        <div className="flex flex-wrap gap-3">
          {evento.contrato_storage && (
            <button className={btnPrimario} onClick={() => void abrir()}>
              Ver contrato
            </button>
          )}
          <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom`}>
            {evento.contrato_storage ? 'Trocar arquivo' : 'Anexar contrato'}
            <input type="file" className="sr-only" onChange={(e) => { void anexar(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
      </Cartao>

      {perfil?.papel === 'dona' && (
        <button className={btnSecundario} onClick={() => void apagar()}>
          Apagar evento
        </button>
      )}
    </div>
  )
}
