import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { CATEGORIA_PROMPT_ROTULO, CATEGORIAS_PROMPT } from '../../lib/tipos'
import type { CategoriaPrompt, Cliente, Prompt } from '../../lib/tipos'

interface Rascunho {
  id: string | null
  categoria: CategoriaPrompt
  titulo: string
  ferramenta: string
  texto: string
  notas: string
  geral: boolean
}

const vazio: Rascunho = { id: null, categoria: 'design', titulo: '', ferramenta: '', texto: '', notas: '', geral: false }

export default function PromptsSkills({ cliente }: { cliente: Cliente }) {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [itens, setItens] = useState<Prompt[]>([])
  const [form, setForm] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .or(`cliente_id.eq.${cliente.id},cliente_id.is.null`)
      .order('titulo')
    setItens((data as Prompt[]) ?? [])
  }, [cliente.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const podeEditar = (p: Prompt) => p.cliente_id !== null || dona

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = {
      categoria: form.categoria,
      titulo: form.titulo.trim(),
      ferramenta: form.ferramenta.trim() || null,
      texto: form.texto,
      notas: form.notas.trim() || null,
    }
    const { error } = form.id
      ? await supabase.from('prompts').update(campos).eq('id', form.id)
      : await supabase.from('prompts').insert({ ...campos, cliente_id: form.geral && dona ? null : cliente.id })
    if (error) return setErro('Não foi possível salvar.')
    setForm(null)
    void carregar()
  }

  async function remover(p: Prompt) {
    if (!window.confirm(`Remover "${p.titulo}"?`)) return
    await supabase.from('prompts').delete().eq('id', p.id)
    void carregar()
  }

  async function copiar(p: Prompt) {
    try {
      await navigator.clipboard.writeText(p.texto)
      setCopiado(p.id)
      setTimeout(() => setCopiado((atual) => (atual === p.id ? null : atual)), 2000)
    } catch {
      setErro('Não deu para copiar sozinho. Abra o item, selecione o texto e copie.')
    }
  }

  return (
    <Cartao className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Titulo>Prompts e skills</Titulo>
        <button className={btnPrimario} onClick={() => setForm({ ...vazio })}>
          Novo prompt
        </button>
      </div>
      <p className="text-sm text-texto-suave">
        Só você e a equipe veem esta parte; o cliente nunca. Guarde aqui os prompts e as skills do Claude para design e
        edição de vídeo. Os marcados como "Geral" valem para todos os clientes.
      </p>

      {form && (
        <form onSubmit={salvar} className="space-y-3 rounded-md border border-linha bg-fundo p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Categoria">
              <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaPrompt })}>
                {CATEGORIAS_PROMPT.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_PROMPT_ROTULO[c]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Título">
              <input required className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Campo>
            <Campo rotulo="Ferramenta">
              <input className={inputCls} list="ferramentas" placeholder="Claude, Canva, CapCut..." value={form.ferramenta} onChange={(e) => setForm({ ...form, ferramenta: e.target.value })} />
              <datalist id="ferramentas">
                {['Claude', 'Canva', 'CapCut', 'Figma', 'Photoshop', 'Premiere', 'After Effects', 'Midjourney'].map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </Campo>
          </div>
          <Campo rotulo="Prompt ou skill (o texto que você cola no Claude)">
            <textarea required rows={9} className={`${inputCls} font-mono text-sm`} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
          </Campo>
          <Campo rotulo="Notas (como usar, o que muda de um cliente para outro)">
            <textarea rows={3} className={inputCls} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </Campo>
          {dona && !form.id && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={form.geral} onChange={(e) => setForm({ ...form, geral: e.target.checked })} />
              Geral: vale para todos os clientes
            </label>
          )}
          <div className="flex gap-3">
            <button type="submit" className={btnPrimario}>
              Salvar
            </button>
            <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {itens.length === 0 && <p className="text-sm text-texto-suave">Nenhum prompt ainda.</p>}
      {CATEGORIAS_PROMPT.map((cat) => {
        const doGrupo = itens.filter((p) => p.categoria === cat)
        if (doGrupo.length === 0) return null
        return (
          <section key={cat} className="space-y-2">
            <h3 className="font-titulo text-xl font-semibold text-texto">{CATEGORIA_PROMPT_ROTULO[cat]}</h3>
            {doGrupo.map((p) => (
              <details key={p.id} className="rounded-sm border border-linha bg-superficie">
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 p-3">
                  <span className="font-medium">{p.titulo}</span>
                  {p.ferramenta && <span className="text-sm text-texto-suave">· {p.ferramenta}</span>}
                  {p.cliente_id === null && <span className="rounded-sm border border-linha px-1.5 text-xs text-texto-suave">Geral</span>}
                </summary>
                <div className="space-y-3 border-t border-linha p-3">
                  <pre className="whitespace-pre-wrap rounded-sm bg-fundo p-3 font-mono text-sm">{p.texto}</pre>
                  {p.notas && <p className="whitespace-pre-wrap text-sm text-texto-suave">{p.notas}</p>}
                  <div className="flex flex-wrap gap-3">
                    <button className={btnPrimario} onClick={() => void copiar(p)}>
                      {copiado === p.id ? 'Copiado' : 'Copiar'}
                    </button>
                    {podeEditar(p) && (
                      <>
                        <button
                          className={btnSecundario}
                          onClick={() =>
                            setForm({ id: p.id, categoria: p.categoria, titulo: p.titulo, ferramenta: p.ferramenta ?? '', texto: p.texto, notas: p.notas ?? '', geral: p.cliente_id === null })
                          }
                        >
                          Editar
                        </button>
                        <button className={btnSecundario} onClick={() => void remover(p)}>
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </section>
        )
      })}
    </Cartao>
  )
}
