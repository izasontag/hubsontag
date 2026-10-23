import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { decifrar, gerarChaves, guardarChaveSessao, lerChaveSessao } from '../../lib/cofre'
import { supabase } from '../../lib/supabase'
import type { AcessoEvento, Evento, PerguntaEvento } from '../../lib/tipos'

const novoToken = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')

// ---------------------------------------------------------------- link
function LinkEvento({ evento, onChange }: { evento: Evento; onChange: (e: Evento) => void }) {
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [recado, setRecado] = useState(evento.recado_portal ?? '')
  const link = `${window.location.origin}/evento/${evento.token_portal}`

  async function atualizar(campos: Partial<Evento>, sucesso: string) {
    setMsg('')
    setErro('')
    const { data, error } = await supabase.from('eventos').update(campos).eq('id', evento.id).select().single()
    if (error || !data) return setErro('Não foi possível atualizar.')
    onChange(data as Evento)
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
        Link secreto para o cliente do evento responder o checklist do grande dia e enviar o acesso do Instagram, sem criar conta. Quem tiver o
        link acessa, então envie só ao cliente.
      </p>
      <input readOnly className={inputCls} value={link} onFocus={(e) => e.target.select()} aria-label="Link do portal do evento" />
      <div className="flex flex-wrap gap-3">
        <button className={btnPrimario} onClick={() => void copiar()}>Copiar link</button>
        <a className={btnSecundario} href={link} target="_blank" rel="noreferrer">Abrir o portal</a>
        <button
          className={btnSecundario}
          onClick={() => void atualizar({ portal_ativo: !evento.portal_ativo }, evento.portal_ativo ? 'Portal desativado.' : 'Portal ativado.')}
        >
          {evento.portal_ativo ? 'Desativar portal' : 'Ativar portal'}
        </button>
        <button className={btnSecundario} onClick={trocar}>Trocar link</button>
      </div>
      {!evento.portal_ativo && <Aviso tipo="erro">Portal desativado: o link não abre para o cliente.</Aviso>}
      <Campo rotulo="Recado para o cliente (aparece no topo do portal)">
        <textarea className={`${inputCls} min-h-20`} maxLength={1000} value={recado} onChange={(e) => setRecado(e.target.value)} />
      </Campo>
      <button className={btnSecundario} onClick={() => void atualizar({ recado_portal: recado.trim() || null }, 'Recado salvo.')}>Salvar recado</button>
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  )
}

// ---------------------------------------------------------------- perguntas
interface FormPergunta {
  id: string | null
  secao: string
  pergunta: string
}

function Perguntas({ evento }: { evento: Evento }) {
  const [lista, setLista] = useState<PerguntaEvento[] | null>(null)
  const [form, setForm] = useState<FormPergunta | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('evento_perguntas').select('*').eq('evento_id', evento.id).order('ordem')
    if (error) return setErro('Não foi possível carregar as perguntas.')
    setLista(data as PerguntaEvento[])
  }, [evento.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form || !form.pergunta.trim()) return
    setErro('')
    const dados = { secao: form.secao.trim() || 'Geral', pergunta: form.pergunta.trim() }
    const maior = Math.max(0, ...(lista ?? []).map((p) => p.ordem))
    const { error } = form.id
      ? await supabase.from('evento_perguntas').update(dados).eq('id', form.id)
      : await supabase.from('evento_perguntas').insert({ ...dados, evento_id: evento.id, ordem: maior + 1 })
    if (error) return setErro('Não foi possível salvar a pergunta.')
    setForm(null)
    void carregar()
  }

  async function apagar(p: PerguntaEvento) {
    if (!window.confirm('Apagar esta pergunta e a resposta dela?')) return
    const { error } = await supabase.from('evento_perguntas').delete().eq('id', p.id)
    if (error) return setErro('Não foi possível apagar.')
    void carregar()
  }

  const respondidas = (lista ?? []).filter((p) => p.resposta).length
  const total = lista?.length ?? 0
  const secoes = [...new Set((lista ?? []).map((p) => p.secao))]

  return (
    <Cartao className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Titulo>Checklist do grande dia</Titulo>
          <p className="mt-1 text-sm text-texto-suave" aria-live="polite">
            {respondidas} de {total} respondidas pelo cliente
          </p>
        </div>
        <button className={btnSecundario} onClick={() => setForm({ id: null, secao: secoes[0] ?? 'Geral', pergunta: '' })}>
          Nova pergunta
        </button>
      </div>
      {total > 0 && (
        <div className="h-2 rounded-full bg-areia" role="progressbar" aria-valuenow={respondidas} aria-valuemin={0} aria-valuemax={total} aria-label="Perguntas respondidas">
          <div className="anim-crescer h-2 rounded-full bg-musgo" style={{ width: `${(respondidas / total) * 100}%` }} />
        </div>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {form && (
        <form onSubmit={salvar} className="space-y-3 rounded-md border border-linha bg-superficie p-4">
          <Campo rotulo="Seção">
            <input className={inputCls} list="secoes-evento" maxLength={80} value={form.secao} onChange={(e) => setForm({ ...form, secao: e.target.value })} />
            <datalist id="secoes-evento">
              {secoes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Pergunta">
            <textarea className={`${inputCls} min-h-20`} maxLength={500} required value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} />
          </Campo>
          <div className="flex gap-3">
            <button className={btnPrimario}>Salvar</button>
            <button type="button" className={btnSecundario} onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {secoes.map((secao) => (
        <section key={secao} className="space-y-3">
          <h3 className="eyebrow">{secao}</h3>
          <ul className="space-y-3">
            {(lista ?? [])
              .filter((p) => p.secao === secao)
              .map((p) => (
                <li key={p.id} className="rounded-md border border-linha bg-superficie p-4">
                  <p className="text-sm font-medium">{p.pergunta}</p>
                  {p.resposta ? (
                    <p className="mt-2 whitespace-pre-wrap border-l-2 border-musgo pl-3 text-sm text-texto">{p.resposta}</p>
                  ) : (
                    <p className="mt-2 text-sm text-texto-suave">Ainda sem resposta.</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button className="min-h-11 cursor-pointer px-2 text-sm text-marrom underline" onClick={() => setForm({ id: p.id, secao: p.secao, pergunta: p.pergunta })}>
                      Editar pergunta
                    </button>
                    <button className="min-h-11 cursor-pointer px-2 text-sm text-red-800 underline" onClick={() => void apagar(p)}>
                      Apagar
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Cartao>
  )
}

// ---------------------------------------------------------------- cofre do Instagram (só a dona)
function CofreInstagram({ evento }: { evento: Evento }) {
  const [temChave, setTemChave] = useState<boolean | null>(null)
  const [acesso, setAcesso] = useState<AcessoEvento | null>(null)
  const [chave, setChave] = useState<string | null>(() => lerChaveSessao())
  const [colada, setColada] = useState('')
  const [nova, setNova] = useState<string | null>(null)
  const [guardei, setGuardei] = useState(false)
  const [revelado, setRevelado] = useState<{ usuario: string; senha: string } | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const [c, a] = await Promise.all([
      supabase.from('cofre_config').select('id').maybeSingle(),
      supabase.from('evento_acessos').select('*').eq('evento_id', evento.id).maybeSingle(),
    ])
    if (c.error || a.error) return setErro('Não foi possível carregar o cofre.')
    setTemChave(Boolean(c.data))
    setAcesso((a.data as AcessoEvento) ?? null)
  }, [evento.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // esconde a senha sozinha depois de 30 segundos
  useEffect(() => {
    if (!revelado) return
    const t = window.setTimeout(() => setRevelado(null), 30000)
    return () => window.clearTimeout(t)
  }, [revelado])

  async function criarChave() {
    setErro('')
    try {
      const { publica, privada } = await gerarChaves()
      const { error } = await supabase.from('cofre_config').insert({ id: 1, chave_publica: publica })
      if (error) return setErro('Não foi possível criar a chave. Atualize a página e veja se ela já existe.')
      setNova(privada)
      setGuardei(false)
      setTemChave(true)
    } catch {
      setErro('Este navegador não conseguiu criar a chave. Tente no Chrome ou Safari atualizados.')
    }
  }

  function baixarChave() {
    if (!nova) return
    const url = URL.createObjectURL(new Blob([nova], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'chave-do-cofre-sontag.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copiarChave() {
    if (!nova) return
    try {
      await navigator.clipboard.writeText(nova)
      setMsg('Chave copiada. Cole no seu gerenciador de senhas.')
    } catch {
      setErro('Não deu para copiar. Use o botão de baixar o arquivo.')
    }
  }

  function concluirCriacao() {
    if (!nova) return
    guardarChaveSessao(nova)
    setChave(nova)
    setNova(null)
  }

  function destrancar() {
    const c = colada.replace(/\s+/g, '')
    if (!c) return
    guardarChaveSessao(c)
    setChave(c)
    setColada('')
    setErro('')
  }

  async function mostrar() {
    if (!acesso || !chave) return
    setErro('')
    try {
      setRevelado({ usuario: acesso.usuario, senha: await decifrar(chave, acesso.senha_cifrada) })
    } catch {
      guardarChaveSessao(null)
      setChave(null)
      setErro('Essa chave não abre este acesso. Confira se colou a chave certa (a mesma criada junto com o cofre).')
    }
  }

  async function copiar(texto: string, nome: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setMsg(`${nome} copiado.`)
    } catch {
      setErro('Não deu para copiar. Selecione e copie à mão.')
    }
  }

  async function removerAcesso() {
    if (!window.confirm('Apagar o login e a senha enviados por este cliente? Faça isso depois do evento.')) return
    const { error } = await supabase.from('evento_acessos').delete().eq('evento_id', evento.id)
    if (error) return setErro('Não foi possível apagar.')
    setRevelado(null)
    void carregar()
  }

  return (
    <Cartao className="space-y-4">
      <Titulo>Acesso do Instagram</Titulo>
      <p className="text-sm text-texto-suave">
        O cliente digita o login e a senha no portal. A senha é trancada no celular dele antes de ser enviada: o banco de dados guarda só o texto
        trancado, e quem abre é você, com a sua chave do cofre.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      {temChave === false && (
        <div className="space-y-3 rounded-md border border-linha bg-superficie p-4">
          <p className="text-sm">
            Primeiro, crie a <strong>chave do cofre</strong> (uma vez só, vale para todos os eventos). Sem ela, o portal não mostra o campo de senha.
          </p>
          <button className={btnPrimario} onClick={() => void criarChave()}>Criar a chave do cofre</button>
        </div>
      )}

      {nova && (
        <div className="space-y-3 rounded-md border border-mostarda bg-mostarda/40 p-4">
          <p className="text-sm font-medium">Guarde esta chave agora. Ela aparece só desta vez.</p>
          <p className="text-sm">
            Salve no seu gerenciador de senhas ou baixe o arquivo e guarde em lugar seguro. <strong>Se perder, não dá para abrir as senhas já enviadas</strong>
            (o cliente teria que enviar de novo).
          </p>
          <textarea readOnly className={`${inputCls} min-h-24 break-all font-mono text-xs`} value={nova} onFocus={(e) => e.target.select()} aria-label="Chave do cofre" />
          <div className="flex flex-wrap gap-3">
            <button className={btnSecundario} onClick={() => void copiarChave()}>Copiar chave</button>
            <button className={btnSecundario} onClick={baixarChave}>Baixar arquivo</button>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={guardei} onChange={(e) => setGuardei(e.target.checked)} className="h-5 w-5" />
            Já guardei a chave em lugar seguro
          </label>
          <button className={btnPrimario} disabled={!guardei} onClick={concluirCriacao}>Continuar</button>
        </div>
      )}

      {temChave && !nova && !acesso && <p className="text-sm text-texto-suave">O cliente ainda não enviou o acesso do Instagram.</p>}

      {temChave && !nova && acesso && (
        <div className="space-y-3 rounded-md border border-linha bg-superficie p-4">
          <p className="text-sm">
            Acesso enviado por <strong>{acesso.usuario}</strong> em {new Date(acesso.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
          </p>
          {acesso.observacao && <p className="text-sm text-texto-suave">Observação do cliente: {acesso.observacao}</p>}
          {!chave && (
            <div className="space-y-2">
              <Campo rotulo="Cole a chave do cofre para ver a senha">
                <textarea className={`${inputCls} min-h-20 break-all font-mono text-xs`} value={colada} onChange={(e) => setColada(e.target.value)} autoComplete="off" />
              </Campo>
              <button className={btnSecundario} onClick={destrancar}>Destrancar</button>
            </div>
          )}
          {chave && !revelado && <button className={btnPrimario} onClick={() => void mostrar()}>Mostrar login e senha</button>}
          {revelado && (
            <div className="space-y-2 rounded-md bg-areia p-3 text-sm" aria-live="polite">
              <p>
                Login: <strong className="break-all">{revelado.usuario}</strong>
              </p>
              <p>
                Senha: <strong className="break-all font-mono">{revelado.senha}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <button className={btnSecundario} onClick={() => void copiar(revelado.usuario, 'Login')}>Copiar login</button>
                <button className={btnSecundario} onClick={() => void copiar(revelado.senha, 'Senha')}>Copiar senha</button>
                <button className={btnSecundario} onClick={() => setRevelado(null)}>Esconder</button>
              </div>
              <p className="text-xs text-texto-suave">A senha se esconde sozinha em 30 segundos.</p>
            </div>
          )}
          <button className="min-h-11 cursor-pointer text-sm text-red-800 underline" onClick={() => void removerAcesso()}>
            Apagar o acesso (faça isso depois do evento)
          </button>
        </div>
      )}
    </Cartao>
  )
}

export default function PortalEvento({ evento, onChange, dona }: { evento: Evento; onChange: (e: Evento) => void; dona: boolean }) {
  return (
    <div className="space-y-6">
      {dona && <LinkEvento evento={evento} onChange={onChange} />}
      <Perguntas evento={evento} />
      {dona && <CofreInstagram evento={evento} />}
    </div>
  )
}

