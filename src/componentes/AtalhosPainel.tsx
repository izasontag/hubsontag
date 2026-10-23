import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { enderecoPinterestValido, idDoPin, lerEnderecoAgenda } from '../lib/atalhos'
import { supabase } from '../lib/supabase'
import type { Atalho } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from './ui'

export default function AtalhosPainel() {
  const [atalhos, setAtalhos] = useState<Atalho[] | null>(null)
  const [codigoAgenda, setCodigoAgenda] = useState('')
  const [editandoAgenda, setEditandoAgenda] = useState(false)
  const [novo, setNovo] = useState<{ tipo: 'pinterest_quadro' | 'pinterest_pin'; titulo: string; url: string } | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('atalhos').select('*').order('ordem').order('criado_em')
    setAtalhos((data as Atalho[]) ?? [])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const agenda = atalhos?.find((a) => a.tipo === 'agenda')
  const quadros = (atalhos ?? []).filter((a) => a.tipo === 'pinterest_quadro')
  const pins = (atalhos ?? []).filter((a) => a.tipo === 'pinterest_pin')

  async function salvarAgenda(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const url = lerEnderecoAgenda(codigoAgenda)
    if (!url) return setErro('Não reconheci esse código. Ele precisa vir do Google Agenda (calendar.google.com).')
    if (agenda) await supabase.from('atalhos').delete().eq('id', agenda.id)
    const { error } = await supabase.from('atalhos').insert({ tipo: 'agenda', titulo: 'Minha agenda', url })
    if (error) return setErro('Não foi possível salvar a agenda.')
    setCodigoAgenda('')
    setEditandoAgenda(false)
    void carregar()
  }

  async function salvarPinterest(e: FormEvent) {
    e.preventDefault()
    if (!novo) return
    setErro('')
    const url = novo.url.trim()
    if (!enderecoPinterestValido(url)) return setErro('O endereço precisa ser do Pinterest (começar com https://...pinterest...).')
    if (novo.tipo === 'pinterest_pin' && !idDoPin(url)) return setErro('Para mostrar um pin, use o endereço dele, no formato pinterest.com/pin/números.')
    const { error } = await supabase.from('atalhos').insert({ tipo: novo.tipo, titulo: novo.titulo.trim(), url })
    if (error) return setErro('Não foi possível salvar.')
    setNovo(null)
    void carregar()
  }

  async function remover(a: Atalho) {
    await supabase.from('atalhos').delete().eq('id', a.id)
    void carregar()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cartao className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Titulo>Minha agenda</Titulo>
          <a href="https://calendar.google.com/calendar/" target="_blank" rel="noreferrer noopener" className={btnSecundario}>
            Abrir Google Agenda
          </a>
        </div>
        {agenda && !editandoAgenda ? (
          <>
            <iframe
              src={agenda.url}
              title="Google Agenda"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              className="h-[26rem] w-full rounded-sm border border-linha bg-fundo"
            />
            <p className="text-xs text-texto-suave">
              Se aparecer um pedido de login, entre na sua conta do Google neste navegador. O Google só mostra uma agenda privada para quem está logada.
            </p>
            <button className={btnSecundario} onClick={() => setEditandoAgenda(true)}>
              Trocar a agenda
            </button>
          </>
        ) : (
          <form onSubmit={salvarAgenda} className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-texto-suave">
              <li>No computador, abra o Google Agenda e clique na engrenagem, depois em Configurações.</li>
              <li>No menu da esquerda, clique no nome da sua agenda e depois em "Integrar agenda".</li>
              <li>Copie o "Código de incorporação" (começa com &lt;iframe) e cole abaixo. Dá para colar o código inteiro.</li>
            </ol>
            <Campo rotulo="Código de incorporação do Google Agenda">
              <textarea required rows={3} className={inputCls} value={codigoAgenda} onChange={(e) => setCodigoAgenda(e.target.value)} />
            </Campo>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Mostrar minha agenda aqui
              </button>
              {agenda && (
                <button type="button" className={btnSecundario} onClick={() => setEditandoAgenda(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
      </Cartao>

      <Cartao className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Titulo>Pinterest</Titulo>
          <a href="https://br.pinterest.com/" target="_blank" rel="noreferrer noopener" className={btnSecundario}>
            Abrir Pinterest
          </a>
        </div>
        <p className="text-sm text-texto-suave">O Pinterest não deixa o site inteiro aparecer aqui dentro. Guarde seus quadros como atalhos e fixe pins para ver a inspiração direto no painel.</p>
        {quadros.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {quadros.map((q) => (
              <li key={q.id} className="flex items-center rounded-sm border border-linha bg-fundo">
                <a href={q.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center px-3 text-sm text-musgo underline underline-offset-4">
                  {q.titulo}
                </a>
                <button type="button" aria-label={`Remover ${q.titulo}`} onClick={() => void remover(q)} className="h-11 w-9 cursor-pointer text-texto-suave hover:text-marrom">
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
        {pins.length > 0 && (
          <ul className="flex flex-wrap gap-4">
            {pins.map((p) => {
              const id = idDoPin(p.url)
              return (
                <li key={p.id} className="space-y-1">
                  {id && (
                    <iframe
                      src={`https://assets.pinterest.com/ext/embed.html?id=${id}`}
                      title={p.titulo}
                      loading="lazy"
                      width={236}
                      height={360}
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                      className="rounded-sm border border-linha"
                    />
                  )}
                  <button className="min-h-11 cursor-pointer text-xs text-texto-suave underline" onClick={() => void remover(p)}>
                    Remover pin
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {novo ? (
          <form onSubmit={salvarPinterest} className="space-y-3 rounded-sm bg-fundo p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="O que adicionar">
                <select className={inputCls} value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as 'pinterest_quadro' | 'pinterest_pin' })}>
                  <option value="pinterest_quadro">Atalho para um quadro</option>
                  <option value="pinterest_pin">Pin para ver aqui</option>
                </select>
              </Campo>
              <Campo rotulo="Nome">
                <input required className={inputCls} value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} />
              </Campo>
            </div>
            <Campo rotulo="Endereço no Pinterest">
              <input required className={inputCls} placeholder="https://br.pinterest.com/..." value={novo.url} onChange={(e) => setNovo({ ...novo, url: e.target.value })} />
            </Campo>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Salvar
              </button>
              <button type="button" className={btnSecundario} onClick={() => setNovo(null)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button className={btnSecundario} onClick={() => setNovo({ tipo: 'pinterest_quadro', titulo: '', url: '' })}>
            Adicionar quadro ou pin
          </button>
        )}
      </Cartao>
      {erro && (
        <div className="lg:col-span-2">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}
    </div>
  )
}
