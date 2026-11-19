import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import KickoffVisao from '../../componentes/KickoffVisao'
import { DICA_TEXTO } from '../../componentes/Texto'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { supabase } from '../../lib/supabase'
import type { Cliente, Kickoff, Metrica } from '../../lib/tipos'

interface Form {
  data_inicio: string
  resumo: string
  diagnostico: string
  pontos_fortes: string
  oportunidades: string
  metricas: Metrica[]
  publicado: boolean
  publicadoEm: string | null
}

const vazio: Form = { data_inicio: '', resumo: '', diagnostico: '', pontos_fortes: '', oportunidades: '', metricas: [], publicado: false, publicadoEm: null }
const METRICAS_SUGERIDAS = ['Seguidores', 'Alcance médio por post', 'Engajamento', 'Posts por semana', 'Visitas ao perfil']

// Aba "Kick-off": o retrato do perfil no começo do trabalho (resumo, números e diagnóstico), para o cliente ver a evolução.
export default function KickOff({ cliente }: { cliente: Cliente }) {
  const [form, setForm] = useState<Form | null>(null)
  const [previa, setPrevia] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('kickoffs').select('*').eq('cliente_id', cliente.id).maybeSingle()
    if (error) return setErro('Não foi possível carregar o kick-off. Confira se o arquivo 018_estrategia_kickoff.sql foi rodado no Supabase.')
    const k = data as Kickoff | null
    setErro('')
    setForm(
      k
        ? { data_inicio: k.data_inicio ?? '', resumo: k.resumo ?? '', diagnostico: k.diagnostico ?? '', pontos_fortes: k.pontos_fortes ?? '', oportunidades: k.oportunidades ?? '', metricas: k.metricas ?? [], publicado: k.publicado, publicadoEm: k.publicado_em }
        : { ...vazio, data_inicio: cliente.data_inicio ?? '' },
    )
  }, [cliente.id, cliente.data_inicio])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (!form) return erro ? <Aviso tipo="erro">{erro}</Aviso> : <p className="anim-respirar text-texto-suave">Carregando...</p>

  const mudar = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v })
  const link = `${window.location.origin}/portal/${cliente.token_portal}/kickoff`

  async function gravar(f: Form, texto?: string) {
    setErro('')
    setMsg('')
    const agora = new Date().toISOString()
    const { error } = await supabase.from('kickoffs').upsert(
      {
        cliente_id: cliente.id,
        data_inicio: f.data_inicio || null,
        resumo: f.resumo.trim() || null,
        diagnostico: f.diagnostico.trim() || null,
        pontos_fortes: f.pontos_fortes.trim() || null,
        oportunidades: f.oportunidades.trim() || null,
        metricas: f.metricas.filter((m) => m.nome.trim()).map((m) => ({ nome: m.nome.trim(), inicio: m.inicio.trim(), atual: m.atual.trim() })),
        publicado: f.publicado,
        publicado_em: f.publicado ? (f.publicadoEm ?? agora) : null,
      },
      { onConflict: 'cliente_id' },
    )
    if (error) return setErro('Não foi possível salvar o kick-off.')
    if (texto) setMsg(texto)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    await gravar(form!, form!.publicado ? 'Salvo e visível para o cliente.' : 'Salvo como rascunho (o cliente ainda não vê).')
    setSalvando(false)
    void carregar()
  }

  async function copiarLink() {
    setErro('')
    try {
      await navigator.clipboard.writeText(link)
      setMsg('Link da página copiado. É só enviar ao cliente.')
    } catch {
      setErro('Não deu para copiar sozinho. Selecione o link e copie.')
    }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-texto-suave">
        O retrato do perfil no começo do trabalho, escrito por você: resumo, números e diagnóstico. Com o tempo, atualize a coluna "Agora" para o cliente ver a evolução. Aparece no portal dele, em <strong>Kick-off</strong>, quando você marcar "Mostrar ao cliente".
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {!cliente.portal_ativo && <Aviso tipo="erro">O portal deste cliente está desativado: ele não consegue abrir o link. Ative na aba Portal.</Aviso>}

      <div className="flex flex-wrap gap-2">
        <button className={btnSecundario} onClick={() => setPrevia(!previa)} aria-pressed={previa}>{previa ? 'Voltar a editar' : 'Ver como o cliente vê'}</button>
        <button className={btnSecundario} onClick={() => void copiarLink()} disabled={!form.publicado}>Copiar link da página</button>
      </div>

      {previa ? (
        <div className="rounded-[18px] border border-linha bg-fundo p-4 sm:p-6">
          <KickoffVisao k={{ data_inicio: form.data_inicio || null, resumo: form.resumo || null, diagnostico: form.diagnostico || null, pontos_fortes: form.pontos_fortes || null, oportunidades: form.oportunidades || null, metricas: form.metricas }} cor={cliente.cor_destaque} />
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-6">
          <Cartao className="space-y-4">
            <Titulo>Ponto de partida</Titulo>
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <Campo rotulo="Data de início do trabalho"><input type="date" className={inputCls} value={form.data_inicio} onChange={(e) => mudar('data_inicio', e.target.value)} /></Campo>
              <Campo rotulo="Resumo em uma frase"><textarea className={`${inputCls} min-h-20`} maxLength={2000} value={form.resumo} onChange={(e) => mudar('resumo', e.target.value)} placeholder="Ex.: Perfil com bom conteúdo, mas sem frequência e sem identidade visual." /></Campo>
            </div>
          </Cartao>

          <Cartao className="space-y-4">
            <Titulo>Números: início e agora</Titulo>
            {form.metricas.length > 0 && <p className="hidden text-xs text-texto-suave sm:block">Nome da métrica, valor no início e valor agora.</p>}
            {form.metricas.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2.75rem] items-end gap-2">
                <input className={inputCls} aria-label="Nome da métrica" placeholder="Ex.: Seguidores" value={m.nome} onChange={(e) => mudar('metricas', form.metricas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
                <input className={inputCls} aria-label={`${m.nome || 'Métrica'} no início`} placeholder="Início" value={m.inicio} onChange={(e) => mudar('metricas', form.metricas.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)))} />
                <input className={inputCls} aria-label={`${m.nome || 'Métrica'} agora`} placeholder="Agora" value={m.atual} onChange={(e) => mudar('metricas', form.metricas.map((x, j) => (j === i ? { ...x, atual: e.target.value } : x)))} />
                <button type="button" className="min-h-11 cursor-pointer text-lg text-texto-suave hover:text-red-800" aria-label={`Remover ${m.nome || 'métrica'}`} onClick={() => mudar('metricas', form.metricas.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecundario} onClick={() => mudar('metricas', [...form.metricas, { nome: '', inicio: '', atual: '' }])}>Adicionar métrica</button>
              {METRICAS_SUGERIDAS.filter((n) => !form.metricas.some((m) => m.nome === n)).slice(0, 3).map((n) => (
                <button key={n} type="button" className="min-h-11 cursor-pointer rounded-full border border-linha px-3 text-xs text-texto-suave hover:bg-areia" onClick={() => mudar('metricas', [...form.metricas, { nome: n, inicio: '', atual: '' }])}>+ {n}</button>
              ))}
            </div>
          </Cartao>

          <Cartao className="space-y-3">
            <Titulo>Diagnóstico do perfil</Titulo>
            <p className="text-xs text-texto-suave">{DICA_TEXTO}</p>
            <textarea aria-label="Diagnóstico do perfil" className={`${inputCls} min-h-48`} maxLength={20000} value={form.diagnostico} onChange={(e) => mudar('diagnostico', e.target.value)} placeholder={'# O que encontramos\n- Bio sem chamada para ação\n- Feed sem padrão visual...'} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="O que já funcionava"><textarea className={`${inputCls} min-h-28`} maxLength={4000} value={form.pontos_fortes} onChange={(e) => mudar('pontos_fortes', e.target.value)} /></Campo>
              <Campo rotulo="Onde vamos melhorar"><textarea className={`${inputCls} min-h-28`} maxLength={4000} value={form.oportunidades} onChange={(e) => mudar('oportunidades', e.target.value)} /></Campo>
            </div>
          </Cartao>

          <Cartao className="space-y-3">
            <label className="flex min-h-11 items-center gap-3 font-medium">
              <input type="checkbox" className="h-6 w-6" checked={form.publicado} onChange={(e) => mudar('publicado', e.target.checked)} />
              Mostrar ao cliente
            </label>
            <p className="text-sm text-texto-suave">{form.publicado ? 'Esta página aparece no portal dele.' : 'Rascunho: só você e a equipe veem.'}</p>
            <button className={btnPrimario} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </Cartao>
        </form>
      )}
    </div>
  )
}
