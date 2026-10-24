import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { lerEnderecoAgenda } from '../lib/atalhos'
import { supabase } from '../lib/supabase'
import type { Atalho } from '../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from './ui'

export default function AtalhosPainel() {
  const [atalhos, setAtalhos] = useState<Atalho[] | null>(null)
  const [codigoAgenda, setCodigoAgenda] = useState('')
  const [editandoAgenda, setEditandoAgenda] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('atalhos').select('*').order('ordem').order('criado_em')
    setAtalhos((data as Atalho[]) ?? [])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const agenda = atalhos?.find((a) => a.tipo === 'agenda')

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


  return (
    <div className="space-y-6">
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
      {erro && (
        <Aviso tipo="erro">{erro}</Aviso>
      )}
    </div>
  )
}
