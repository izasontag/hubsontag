import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { LogoCompleta } from '../../componentes/Logo'
import { Aviso, btnPrimario, Campo, Cartao, Esqueleto, formatarData, inputCls } from '../../componentes/ui'
import { cifrar, LIMITE_BYTES } from '../../lib/cofre'
import { supabase } from '../../lib/supabase'
import type { PortalEventoDados } from '../../lib/tipos'

type Pergunta = PortalEventoDados['perguntas'][number]

function erroAmigavel(msg: string | undefined) {
  const m = msg ?? ''
  if (m.includes('link_invalido')) return 'Este link não está mais ativo. Peça um novo link à Sontag.'
  if (m.includes('cofre_indisponivel')) return 'Esta parte ainda não foi liberada pela Sontag. Fale com a gente.'
  return 'Não foi possível enviar agora. Tente de novo em instantes.'
}

function CampoResposta({ token, p, onSalvo }: { token: string; p: Pergunta; onSalvo: (id: string, texto: string) => void }) {
  const [texto, setTexto] = useState(p.resposta ?? '')
  const [estado, setEstado] = useState<'' | 'salvando' | 'salvo' | 'erro'>('')
  const alterado = texto.trim() !== (p.resposta ?? '').trim()

  async function salvar() {
    setEstado('salvando')
    const { error } = await supabase.rpc('portal_evento_responder', { p_token: token, p_pergunta: p.id, p_resposta: texto })
    if (error) return setEstado('erro')
    onSalvo(p.id, texto.trim())
    setEstado('salvo')
  }

  return (
    <li className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`p-${p.id}`}>{p.pergunta}</label>
      <textarea
        id={`p-${p.id}`}
        className={`${inputCls} min-h-24`}
        maxLength={4000}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setEstado('')
        }}
      />
      <div className="flex min-h-11 items-center gap-3">
        <button className="min-h-11 cursor-pointer rounded-full border border-linha bg-superficie px-5 text-sm transition-colors hover:bg-areia disabled:cursor-default disabled:opacity-50" disabled={!alterado || estado === 'salvando'} onClick={() => void salvar()}>
          {estado === 'salvando' ? 'Salvando…' : 'Salvar resposta'}
        </button>
        <span className="text-sm text-texto-suave" aria-live="polite">
          {estado === 'salvo' && !alterado ? 'Salvo.' : estado === 'erro' ? 'Não foi possível salvar. Tente de novo.' : !alterado && p.resposta ? 'Respondida.' : ''}
        </span>
      </div>
    </li>
  )
}

function AcessoInstagram({ token, dados, onEnviado }: { token: string; dados: PortalEventoDados; onEnviado: () => void }) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  if (!dados.chave_publica) return null

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk(false)
    if (new TextEncoder().encode(senha).length > LIMITE_BYTES) return setErro('A senha está longa demais para enviar por aqui.')
    setEnviando(true)
    try {
      const cifra = await cifrar(dados.chave_publica as string, senha)
      const { error } = await supabase.rpc('portal_evento_acesso', { p_token: token, p_usuario: usuario.trim().replace(/^@/, ''), p_cifra: cifra, p_observacao: obs })
      if (error) setErro(erroAmigavel(error.message))
      else {
        setOk(true)
        setSenha('')
        onEnviado()
      }
    } catch {
      setErro('Este navegador não conseguiu proteger a senha. Abra o link no Chrome ou no Safari atualizados.')
    }
    setEnviando(false)
  }

  return (
    <Cartao className="space-y-4">
      <h2 className="titulo-secao">Acesso ao <em>Instagram</em></h2>
      <p className="text-sm text-texto-suave">
        Para postar os stories do seu evento direto do seu perfil, precisamos do login e da senha. A senha é <strong>trancada neste aparelho</strong> antes de
        ser enviada: só a Sontag consegue abrir, e nós apagamos tudo depois do evento. Depois do evento, recomendamos trocar a senha.
      </p>
      {dados.acesso && (
        <Aviso tipo="ok">
          Acesso de <strong>{dados.acesso.usuario}</strong> já enviado. Se precisar corrigir, é só enviar de novo abaixo.
        </Aviso>
      )}
      <form onSubmit={enviar} className="space-y-4" autoComplete="off">
        <Campo rotulo="Usuário do Instagram (sem o @)">
          <input className={inputCls} required maxLength={80} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        </Campo>
        <Campo rotulo="Senha do Instagram">
          <input className={inputCls} type="password" required maxLength={100} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
        </Campo>
        <Campo rotulo="Observação (opcional). Ex.: tenho verificação em duas etapas">
          <input className={inputCls} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Campo>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {ok && <Aviso tipo="ok">Acesso enviado com segurança. Obrigada!</Aviso>}
        <button className={btnPrimario} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar acesso'}</button>
      </form>
    </Cartao>
  )
}

export default function PortalEventoPagina() {
  const { token = '' } = useParams()
  const [dados, setDados] = useState<PortalEventoDados | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [invalido, setInvalido] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('portal_evento_dados', { p_token: token })
    if (error || !data) setInvalido(true)
    else setDados(data as PortalEventoDados)
    setCarregando(false)
  }, [token])

  useEffect(() => {
    void carregar()
  }, [carregar])

  function atualizarResposta(id: string, texto: string) {
    setDados((d) => (d ? { ...d, perguntas: d.perguntas.map((p) => (p.id === id ? { ...p, resposta: texto || null } : p)) } : d))
  }

  if (carregando) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Esqueleto className="h-40" />
        <Esqueleto className="h-32" />
      </div>
    )
  }
  if (invalido || !dados) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <LogoCompleta className="justify-center" />
          <p className="text-texto-suave">Este link não está ativo. Peça um novo link à Sontag.</p>
        </div>
      </main>
    )
  }

  const total = dados.perguntas.length
  const respondidas = dados.perguntas.filter((p) => p.resposta).length
  const secoes = [...new Set(dados.perguntas.map((p) => p.secao))]
  const detalhes = [dados.categoria, formatarData(dados.data_evento), dados.horario?.slice(0, 5), dados.local].filter(Boolean).join(' · ')

  return (
    <main className="min-h-screen pb-16">
      <header className="listras festao-baixo relative px-4 pb-14 pt-8 sm:px-8" style={{ '--festao': 'var(--color-azul-pastel)' } as CSSProperties}>
        <div className="mx-auto max-w-2xl">
          <div className="bilhete nota-papel anim-entrar space-y-3 px-6 py-7">
            <LogoCompleta />
            <p className="eyebrow">Checklist do grande dia</p>
            <h1 className="titulo-pagina">{dados.nome}</h1>
            <p className="text-sm text-texto-suave">{detalhes}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-2xl space-y-8 px-4 sm:px-8">
        {dados.recado && <p className="whitespace-pre-wrap rounded-md border border-linha bg-superficie p-4 text-sm">{dados.recado}</p>}
        <p className="text-sm text-texto-suave">
          Responda com calma, do seu jeito. Quanto mais detalhes, melhor fica a cobertura de stories do seu evento. Você pode voltar neste link quantas vezes quiser.
        </p>
        {total > 0 && (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-areia" role="progressbar" aria-valuenow={respondidas} aria-valuemin={0} aria-valuemax={total} aria-label="Perguntas respondidas">
              <div className="h-2 rounded-full bg-musgo transition-all duration-500" style={{ width: `${(respondidas / total) * 100}%` }} />
            </div>
            <p className="text-sm text-texto-suave" aria-live="polite">{respondidas} de {total} respondidas</p>
          </div>
        )}

        {secoes.map((secao) => (
          <Cartao key={secao} className="space-y-5">
            <h2 className="titulo-sub">{secao}</h2>
            <ul className="space-y-6">
              {dados.perguntas
                .filter((p) => p.secao === secao)
                .map((p) => (
                  <CampoResposta key={p.id} token={token} p={p} onSalvo={atualizarResposta} />
                ))}
            </ul>
          </Cartao>
        ))}

        <AcessoInstagram token={token} dados={dados} onEnviado={() => void carregar()} />
      </div>
    </main>
  )
}
