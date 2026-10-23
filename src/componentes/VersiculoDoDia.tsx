import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { VersiculoProprio } from '../lib/tipos'
import { VERSICULOS, versiculoDoDia } from '../lib/versiculos'
import { Aviso, btnPrimario, btnSecundario, Campo, inputCls } from './ui'

export default function VersiculoDoDia() {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [proprios, setProprios] = useState<VersiculoProprio[]>([])
  const [aberto, setAberto] = useState(false)
  const [referencia, setReferencia] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    if (!dona) return
    const { data } = await supabase.from('versiculos').select('*').order('criado_em')
    setProprios((data as VersiculoProprio[]) ?? [])
  }, [dona])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const hoje = versiculoDoDia([...VERSICULOS, ...proprios])

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase.from('versiculos').insert({ referencia: referencia.trim(), texto: texto.trim() })
    if (error) return setErro('Não foi possível salvar o versículo.')
    setReferencia('')
    setTexto('')
    void carregar()
  }

  async function remover(v: VersiculoProprio) {
    await supabase.from('versiculos').delete().eq('id', v.id)
    void carregar()
  }

  return (
    <section aria-label="Versículo do dia" className="relative overflow-hidden rounded-md border border-linha bg-superficie p-6 shadow-suave">
      <span aria-hidden className="pointer-events-none absolute -left-1 -top-10 select-none font-titulo text-[8rem] leading-none text-areia">
        &ldquo;
      </span>
      <div className="relative">
        <p className="eyebrow mb-3">Versículo do dia</p>
        <blockquote key={hoje.referencia} className="anim-entrar">
          <p className="font-titulo text-2xl font-medium italic leading-snug text-texto">{hoje.texto}</p>
          <footer className="mt-4 text-sm text-texto-suave">
            <cite className="not-italic">{hoje.referencia}</cite>
          </footer>
        </blockquote>
        {dona && (
          <div className="mt-4">
            <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="min-h-11 cursor-pointer text-sm text-musgo underline underline-offset-4">
              {aberto ? 'Fechar' : 'Adicionar meus versículos'}
            </button>
            {aberto && (
              <div className="anim-surgir mt-2 space-y-4">
                <p className="text-sm text-texto-suave">
                  Os seus versículos entram na mesma rotação diária, junto com os {VERSICULOS.length} que já vêm no site (tradução Almeida; confira com a sua Bíblia).
                </p>
                <form onSubmit={adicionar} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                  <Campo rotulo="Referência">
                    <input required className={inputCls} placeholder="Salmos 23:1" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                  </Campo>
                  <Campo rotulo="Texto">
                    <input required className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} />
                  </Campo>
                  <button type="submit" className={btnPrimario}>
                    Adicionar
                  </button>
                </form>
                {erro && <Aviso tipo="erro">{erro}</Aviso>}
                <ul className="divide-y divide-linha">
                  {proprios.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <strong className="font-medium">{v.referencia}</strong> · {v.texto}
                      </span>
                      <button className={btnSecundario} onClick={() => void remover(v)}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
