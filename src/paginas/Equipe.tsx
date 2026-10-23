import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Aviso, btnPrimario, btnSecundario, CabecalhoPagina, Campo, Cartao, formatarData, inputCls, Titulo } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { ClienteResumo } from '../lib/tipos'

interface Pessoa {
  id: string
  nome: string
  email: string
}
interface EventoMin {
  id: string
  nome: string
  data_evento: string
}
interface Vinculo {
  perfil_id: string
  cliente_id?: string
  evento_id?: string
}

export default function Equipe() {
  const { perfil } = useAuth()
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null)
  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [eventos, setEventos] = useState<EventoMin[]>([])
  const [porCliente, setPorCliente] = useState<Vinculo[]>([])
  const [porEvento, setPorEvento] = useState<Vinculo[]>([])
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const [p, c, e, vc, ve] = await Promise.all([
      supabase.from('perfis').select('id, nome, email').eq('papel', 'equipe').order('nome'),
      supabase.from('clientes').select('id, nome, cor_destaque').neq('status', 'encerrado').order('nome'),
      supabase.from('eventos').select('id, nome, data_evento').order('data_evento', { ascending: false }),
      supabase.from('equipe_clientes').select('perfil_id, cliente_id'),
      supabase.from('equipe_eventos').select('perfil_id, evento_id'),
    ])
    if (p.error) return setErro('Não foi possível carregar a equipe.')
    setPessoas(p.data as Pessoa[])
    setClientes((c.data as ClienteResumo[]) ?? [])
    setEventos((e.data as EventoMin[]) ?? [])
    setPorCliente((vc.data as Vinculo[]) ?? [])
    setPorEvento((ve.data as Vinculo[]) ?? [])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (perfil && perfil.papel !== 'dona') return <Navigate to="/app" replace />

  async function liberar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setMsg('')
    const { error } = await supabase.rpc('liberar_equipe', { p_email: email.trim(), p_nome: nome.trim() })
    if (error) {
      const m = error.message
      return setErro(
        m.includes('usuario_nao_encontrado')
          ? 'Não achei esse e-mail. Crie o login primeiro no Supabase (passo 1 abaixo) e tente de novo.'
          : m.includes('nome_obrigatorio')
            ? 'Escreva o nome da pessoa.'
            : 'Não foi possível liberar o acesso.',
      )
    }
    setMsg(`Acesso liberado para ${nome.trim()}. Agora escolha abaixo quais clientes e eventos ela pode ver.`)
    setNome('')
    setEmail('')
    void carregar()
  }

  async function alternarCliente(p: Pessoa, clienteId: string, ligado: boolean) {
    const { error } = ligado
      ? await supabase.from('equipe_clientes').delete().eq('perfil_id', p.id).eq('cliente_id', clienteId)
      : await supabase.from('equipe_clientes').insert({ perfil_id: p.id, cliente_id: clienteId })
    if (error) setErro('Não foi possível mudar o acesso.')
    void carregar()
  }

  async function alternarEvento(p: Pessoa, eventoId: string, ligado: boolean) {
    const { error } = ligado
      ? await supabase.from('equipe_eventos').delete().eq('perfil_id', p.id).eq('evento_id', eventoId)
      : await supabase.from('equipe_eventos').insert({ perfil_id: p.id, evento_id: eventoId })
    if (error) setErro('Não foi possível mudar o acesso.')
    void carregar()
  }

  async function remover(p: Pessoa) {
    if (!window.confirm(`Tirar o acesso de ${p.nome}? O login dela continua existindo no Supabase, mas ela não vê mais nada.`)) return
    const { error } = await supabase.from('perfis').delete().eq('id', p.id)
    if (error) return setErro('Não foi possível tirar o acesso.')
    void carregar()
  }

  return (
    <div className="space-y-8">
      <CabecalhoPagina rotulo="Só você vê esta área" titulo="Equipe" />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      <Cartao className="space-y-4">
        <Titulo>Liberar uma pessoa</Titulo>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-texto-suave">
          <li>
            No Supabase, abra <strong className="font-medium text-texto">Authentication</strong>, depois <strong className="font-medium text-texto">Users</strong>, <strong className="font-medium text-texto">Add user</strong> e{' '}
            <strong className="font-medium text-texto">Create new user</strong>. Coloque o e-mail e uma senha e marque <strong className="font-medium text-texto">Auto Confirm User</strong>.
          </li>
          <li>Volte aqui, escreva o nome e o mesmo e-mail, e clique em Liberar acesso.</li>
          <li>Escolha abaixo os clientes e eventos que a pessoa pode ver. A equipe nunca vê o financeiro.</li>
        </ol>
        <form onSubmit={liberar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Campo rotulo="Nome">
            <input required className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="E-mail do login">
            <input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <button type="submit" className={btnPrimario}>
            Liberar acesso
          </button>
        </form>
      </Cartao>

      {pessoas?.length === 0 && <p className="text-texto-suave">Ninguém na equipe ainda.</p>}
      <ul className="space-y-6">
        {pessoas?.map((p) => (
          <li key={p.id}>
            <Cartao className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-titulo text-3xl font-semibold leading-tight">{p.nome}</p>
                  <p className="text-sm text-texto-suave">{p.email}</p>
                </div>
                <button className={btnSecundario} onClick={() => void remover(p)}>
                  Tirar acesso
                </button>
              </div>
              <fieldset>
                <legend className="eyebrow mb-2">Clientes que atende</legend>
                {clientes.length === 0 && <p className="text-sm text-texto-suave">Nenhum cliente cadastrado.</p>}
                <div className="flex flex-wrap gap-2">
                  {clientes.map((c) => {
                    const ligado = porCliente.some((v) => v.perfil_id === p.id && v.cliente_id === c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={ligado}
                        onClick={() => void alternarCliente(p, c.id, ligado)}
                        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 text-sm transition duration-200 ${ligado ? 'border-marrom bg-marrom-claro font-medium text-texto' : 'border-linha text-texto-suave hover:border-marrom'}`}
                      >
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: c.cor_destaque }} />
                        {c.nome}
                        {ligado && <span className="sr-only"> (atende)</span>}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="eyebrow mb-2">Eventos que acompanha</legend>
                {eventos.length === 0 && <p className="text-sm text-texto-suave">Nenhum evento cadastrado.</p>}
                <div className="flex flex-wrap gap-2">
                  {eventos.map((ev) => {
                    const ligado = porEvento.some((v) => v.perfil_id === p.id && v.evento_id === ev.id)
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        aria-pressed={ligado}
                        onClick={() => void alternarEvento(p, ev.id, ligado)}
                        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 text-sm transition duration-200 ${ligado ? 'border-marrom bg-marrom-claro font-medium text-texto' : 'border-linha text-texto-suave hover:border-marrom'}`}
                      >
                        {ev.nome}
                        <span className="text-xs text-texto-suave">{formatarData(ev.data_evento)}</span>
                        {ligado && <span className="sr-only"> (acompanha)</span>}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </Cartao>
          </li>
        ))}
      </ul>
    </div>
  )
}
