import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import EstrategiaVisao from '../../componentes/EstrategiaVisao'
import NumInput from '../../componentes/NumInput'
import { DICA_TEXTO } from '../../componentes/Texto'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { mesDeHoje, nomeDoMes, somarMeses } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import type { Cliente, DataImportante, EstrategiaMensal as Linha, MetaEstrategia, Pilar } from '../../lib/tipos'

interface Form {
  titulo: string
  objetivo: string
  texto: string
  pilares: Pilar[]
  metas: MetaEstrategia[]
  datas: DataImportante[]
  publicado: boolean
  publicadoEm: string | null
}

const vazio: Form = { titulo: '', objetivo: '', texto: '', pilares: [], metas: [], datas: [], publicado: false, publicadoEm: null }

const doBanco = (l: Linha): Form => ({
  titulo: l.titulo ?? '',
  objetivo: l.objetivo ?? '',
  texto: l.texto ?? '',
  pilares: l.pilares ?? [],
  metas: l.metas ?? [],
  datas: l.datas ?? [],
  publicado: l.publicado,
  publicadoEm: l.publicado_em,
})

// Aba "Estratégia" do cliente: uma página por mês, que a dona escreve e decide quando mostrar ao cliente.
export default function EstrategiaMensal({ cliente }: { cliente: Cliente }) {
  const [mes, setMes] = useState(mesDeHoje())
  const [form, setForm] = useState<Form | null>(null)
  const [meses, setMeses] = useState<{ mes: string; titulo: string; publicado: boolean }[]>([])
  const [previa, setPrevia] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const [um, todos] = await Promise.all([
      supabase.from('estrategias_mensais').select('*').eq('cliente_id', cliente.id).eq('mes', `${mes}-01`).maybeSingle(),
      supabase.from('estrategias_mensais').select('mes, titulo, publicado').eq('cliente_id', cliente.id).order('mes', { ascending: false }),
    ])
    if (um.error || todos.error) return setErro('Não foi possível carregar a estratégia. Confira se o arquivo 018_estrategia_kickoff.sql foi rodado no Supabase.')
    setErro('')
    setForm(um.data ? doBanco(um.data as Linha) : { ...vazio })
    setMeses(((todos.data as { mes: string; titulo: string; publicado: boolean }[]) ?? []).map((x) => ({ ...x, mes: x.mes.slice(0, 7) })))
  }, [cliente.id, mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (!form) return erro ? <Aviso tipo="erro">{erro}</Aviso> : <p className="anim-respirar text-texto-suave">Carregando...</p>

  const mudar = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v })
  const soma = form.pilares.reduce((t, p) => t + (Number(p.percentual) || 0), 0)
  const link = `${window.location.origin}/portal/${cliente.token_portal}/estrategia`

  async function salvar(e?: FormEvent) {
    e?.preventDefault()
    if (!form) return
    setErro('')
    setMsg('')
    setSalvando(true)
    const agora = new Date().toISOString()
    const campos = {
      cliente_id: cliente.id,
      mes: `${mes}-01`,
      titulo: form.titulo.trim(),
      objetivo: form.objetivo.trim() || null,
      texto: form.texto.trim() || null,
      pilares: form.pilares.filter((p) => p.nome.trim()).map((p) => ({ nome: p.nome.trim(), percentual: Math.max(0, Math.min(100, Number(p.percentual) || 0)), descricao: p.descricao.trim() })),
      metas: form.metas.filter((m) => m.nome.trim()).map((m) => ({ nome: m.nome.trim(), alvo: m.alvo.trim() })),
      datas: form.datas.filter((d) => d.data && d.titulo.trim()).map((d) => ({ data: d.data, titulo: d.titulo.trim() })),
      publicado: form.publicado,
      publicado_em: form.publicado ? (form.publicadoEm ?? agora) : null,
    }
    const { error } = await supabase.from('estrategias_mensais').upsert(campos, { onConflict: 'cliente_id,mes' })
    setSalvando(false)
    if (error) return setErro('Não foi possível salvar a estratégia.')
    setMsg(form.publicado ? 'Salvo e visível para o cliente.' : 'Salvo como rascunho (o cliente ainda não vê).')
    void carregar()
  }

  async function copiarDoAnterior() {
    const { data } = await supabase.from('estrategias_mensais').select('*').eq('cliente_id', cliente.id).eq('mes', `${somarMeses(mes, -1)}-01`).maybeSingle()
    if (!data) return setErro(`Não há estratégia em ${nomeDoMes(somarMeses(mes, -1))} para copiar.`)
    const a = data as Linha
    setErro('')
    setForm({ ...form!, objetivo: form!.objetivo || (a.objetivo ?? ''), pilares: a.pilares ?? [], metas: (a.metas ?? []).map((m) => ({ nome: m.nome, alvo: '' })) })
    setMsg('Copiei os pilares e os nomes das metas do mês anterior. Ajuste e salve.')
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
      <div className="space-y-3">
        <p className="max-w-2xl text-sm text-texto-suave">
          Escreva a estratégia de cada mês. O cliente só vê quando você marcar "Mostrar ao cliente" e salvar. A página aparece no portal dele, em <strong>Estratégia</strong>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <NavegacaoMes mes={mes} onMes={(m) => { setMes(m); setPrevia(false); setMsg('') }} />
        </div>
        {meses.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Meses com estratégia">
            {meses.map((m) => (
              <button key={m.mes} type="button" onClick={() => { setMes(m.mes); setPrevia(false); setMsg('') }} aria-pressed={m.mes === mes} className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs first-letter:uppercase transition-colors ${m.mes === mes ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave hover:bg-areia'}`}>
                {nomeDoMes(m.mes)} · {m.publicado ? 'publicado' : 'rascunho'}
              </button>
            ))}
          </div>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {!cliente.portal_ativo && <Aviso tipo="erro">O portal deste cliente está desativado: ele não consegue abrir o link. Ative na aba Portal.</Aviso>}

      <div className="flex flex-wrap gap-2">
        <button className={btnSecundario} onClick={() => setPrevia(!previa)} aria-pressed={previa}>{previa ? 'Voltar a editar' : 'Ver como o cliente vê'}</button>
        <button className={btnSecundario} onClick={() => void copiarDoAnterior()}>Copiar pilares do mês anterior</button>
        <button className={btnSecundario} onClick={() => void copiarLink()} disabled={!form.publicado}>Copiar link da página</button>
      </div>

      {previa ? (
        <div className="rounded-[18px] border border-linha bg-fundo p-4 sm:p-6">
          <EstrategiaVisao e={{ mes: `${mes}-01`, titulo: form.titulo, objetivo: form.objetivo || null, texto: form.texto || null, pilares: form.pilares, metas: form.metas, datas: form.datas }} cor={cliente.cor_destaque} />
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-6">
          <Cartao className="space-y-4">
            <Titulo>O mês em uma frase</Titulo>
            <Campo rotulo="Título da página (opcional)"><input className={inputCls} maxLength={120} value={form.titulo} onChange={(e) => mudar('titulo', e.target.value)} placeholder={`Ex.: ${nomeDoMes(mes)}: mês das avaliações`} /></Campo>
            <Campo rotulo="Objetivo do mês"><textarea className={`${inputCls} min-h-20`} maxLength={1000} value={form.objetivo} onChange={(e) => mudar('objetivo', e.target.value)} placeholder="O que queremos alcançar neste mês, em poucas palavras." /></Campo>
          </Cartao>

          <Cartao className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Titulo>Pilares de conteúdo</Titulo>
              <p className={`text-sm ${soma === 100 || form.pilares.length === 0 ? 'text-texto-suave' : 'text-marrom'}`}>Soma dos percentuais: {soma}%{soma !== 100 && form.pilares.length > 0 ? ' (o ideal é 100%)' : ''}</p>
            </div>
            {form.pilares.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_5.5rem_2.75rem] items-end gap-2 rounded-md border border-linha bg-superficie p-3">
                <input className={inputCls} aria-label="Nome do pilar" placeholder="Ex.: Educativo" value={p.nome} onChange={(e) => mudar('pilares', form.pilares.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
                <NumInput rotulo={`Percentual de ${p.nome || 'pilar'}`} valor={p.percentual} onChange={(n) => mudar('pilares', form.pilares.map((x, j) => (j === i ? { ...x, percentual: n } : x)))} />
                <button type="button" className="min-h-11 cursor-pointer text-lg text-texto-suave hover:text-red-800" aria-label={`Remover ${p.nome || 'pilar'}`} onClick={() => mudar('pilares', form.pilares.filter((_, j) => j !== i))}>×</button>
                <input className={`${inputCls} col-span-3`} aria-label="Descrição do pilar" placeholder="O que entra neste pilar (opcional)" value={p.descricao} onChange={(e) => mudar('pilares', form.pilares.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
              </div>
            ))}
            <button type="button" className={btnSecundario} onClick={() => mudar('pilares', [...form.pilares, { nome: '', percentual: 0, descricao: '' }])}>Adicionar pilar</button>
          </Cartao>

          <Cartao className="space-y-4">
            <Titulo>Metas do mês</Titulo>
            {form.metas.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_2.75rem] items-end gap-2">
                <input className={inputCls} aria-label="Nome da meta" placeholder="Ex.: Novos seguidores" value={m.nome} onChange={(e) => mudar('metas', form.metas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
                <input className={inputCls} aria-label={`Valor da meta ${m.nome || ''}`} placeholder="Ex.: 300" value={m.alvo} onChange={(e) => mudar('metas', form.metas.map((x, j) => (j === i ? { ...x, alvo: e.target.value } : x)))} />
                <button type="button" className="min-h-11 cursor-pointer text-lg text-texto-suave hover:text-red-800" aria-label={`Remover meta ${m.nome}`} onClick={() => mudar('metas', form.metas.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className={btnSecundario} onClick={() => mudar('metas', [...form.metas, { nome: '', alvo: '' }])}>Adicionar meta</button>
          </Cartao>

          <Cartao className="space-y-4">
            <Titulo>Datas importantes</Titulo>
            {form.datas.map((d, i) => (
              <div key={i} className="grid grid-cols-[9rem_1fr_2.75rem] items-end gap-2">
                <input type="date" className={inputCls} aria-label="Data" value={d.data} onChange={(e) => mudar('datas', form.datas.map((x, j) => (j === i ? { ...x, data: e.target.value } : x)))} />
                <input className={inputCls} aria-label="O que acontece nessa data" placeholder="Ex.: Lançamento da campanha" value={d.titulo} onChange={(e) => mudar('datas', form.datas.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} />
                <button type="button" className="min-h-11 cursor-pointer text-lg text-texto-suave hover:text-red-800" aria-label="Remover data" onClick={() => mudar('datas', form.datas.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className={btnSecundario} onClick={() => mudar('datas', [...form.datas, { data: `${mes}-01`, titulo: '' }])}>Adicionar data</button>
          </Cartao>

          <Cartao className="space-y-3">
            <Titulo>Texto livre</Titulo>
            <p className="text-xs text-texto-suave">{DICA_TEXTO}</p>
            <textarea aria-label="Texto livre da estratégia" className={`${inputCls} min-h-56`} maxLength={20000} value={form.texto} onChange={(e) => mudar('texto', e.target.value)} placeholder={'# Como vamos trabalhar\n- Frequência: 12 posts e 4 reels\n- Foco em prova social...'} />
          </Cartao>

          <Cartao className="space-y-3">
            <label className="flex min-h-11 items-center gap-3 font-medium">
              <input type="checkbox" className="h-6 w-6" checked={form.publicado} onChange={(e) => mudar('publicado', e.target.checked)} />
              Mostrar ao cliente
            </label>
            <p className="text-sm text-texto-suave">{form.publicado ? 'Esta página aparece no portal dele.' : 'Rascunho: só você e a equipe veem.'}</p>
            <div className="flex flex-wrap gap-3">
              <button className={btnPrimario} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </Cartao>
        </form>
      )}
    </div>
  )
}
