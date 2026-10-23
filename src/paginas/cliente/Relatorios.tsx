import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, inputCls, Titulo } from '../../componentes/ui'
import { useAuth } from '../../lib/auth'
import { limitesDoMes, mesDeHoje, nomeDoMes, somarMeses } from '../../lib/datas'
import { soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import type { Cliente, Relatorio } from '../../lib/tipos'

interface Rascunho {
  id: string | null
  mes: string // AAAA-MM
  resumo: string
  destaques: string
  proximos_passos: string
}

interface PostNumeros {
  tema: string | null
  alcance: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  comentarios_qtd: number | null
}

const n = (v: number) => v.toLocaleString('pt-BR')

export default function Relatorios({ cliente }: { cliente: Cliente }) {
  const { perfil } = useAuth()
  const [itens, setItens] = useState<Relatorio[] | null>(null)
  const [form, setForm] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('relatorios').select('*').eq('cliente_id', cliente.id).order('mes', { ascending: false })
    if (error) return setErro('Não foi possível carregar os relatórios.')
    setItens(data as Relatorio[])
  }, [cliente.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function puxarNumeros() {
    if (!form) return
    setErro('')
    setAviso('')
    const { inicio, fim } = limitesDoMes(form.mes)
    const { data, error } = await supabase
      .from('posts')
      .select('tema, alcance, salvamentos, compartilhamentos, comentarios_qtd')
      .eq('cliente_id', cliente.id)
      .eq('status', 'publicado')
      .gte('data_publicacao', inicio)
      .lte('data_publicacao', fim)
    if (error) return setErro('Não foi possível buscar os números do mês.')
    const posts = data as PostNumeros[]
    if (posts.length === 0) return setAviso('Nenhum post publicado neste mês. Marque os posts como "Publicado" no calendário para eles entrarem aqui.')
    const soma0 = (campo: keyof Omit<PostNumeros, 'tema'>) => soma(posts, (p) => p[campo] ?? 0)
    const melhor = [...posts].sort((a, b) => (b.alcance ?? 0) - (a.alcance ?? 0))[0]
    const texto =
      `Em ${nomeDoMes(form.mes).toLowerCase()}, foram publicados ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}. ` +
      `Alcance total: ${n(soma0('alcance'))}. Salvamentos: ${n(soma0('salvamentos'))}. ` +
      `Compartilhamentos: ${n(soma0('compartilhamentos'))}. Comentários: ${n(soma0('comentarios_qtd'))}.`
    const destaque = melhor.alcance ? `Maior alcance do mês: "${melhor.tema || 'post sem título'}", com ${n(melhor.alcance)} contas alcançadas.` : ''
    setForm({
      ...form,
      resumo: form.resumo.trim() ? `${form.resumo.trim()}\n\n${texto}` : texto,
      destaques: destaque && !form.destaques.includes(destaque) ? (form.destaques.trim() ? `${form.destaques.trim()}\n${destaque}` : destaque) : form.destaques,
    })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = {
      mes: `${form.mes}-01`,
      resumo: form.resumo.trim() || null,
      destaques: form.destaques.trim() || null,
      proximos_passos: form.proximos_passos.trim() || null,
    }
    const { error } = form.id
      ? await supabase.from('relatorios').update(campos).eq('id', form.id)
      : await supabase.from('relatorios').insert({ ...campos, cliente_id: cliente.id })
    if (error) {
      return setErro(error.code === '23505' ? 'Já existe um relatório deste mês. Edite o que já existe na lista.' : 'Não foi possível salvar o relatório.')
    }
    setForm(null)
    void carregar()
  }

  async function remover(r: Relatorio) {
    if (!window.confirm('Apagar este relatório?')) return
    await supabase.from('relatorios').delete().eq('id', r.id)
    void carregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto-suave">O cliente lê estes relatórios na página Relatórios do portal dele.</p>
        <button className={btnPrimario} onClick={() => setForm({ id: null, mes: somarMeses(mesDeHoje(), -1), resumo: '', destaques: '', proximos_passos: '' })}>
          Novo relatório
        </button>
      </div>

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar relatório' : 'Novo relatório'}</Titulo>
            <div className="flex flex-wrap items-end gap-3">
              <Campo rotulo="Mês">
                <input type="month" required className={inputCls} value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} />
              </Campo>
              <button type="button" className={btnSecundario} onClick={() => void puxarNumeros()}>
                Puxar os números do mês
              </button>
            </div>
            {aviso && <Aviso tipo="erro">{aviso}</Aviso>}
            <Campo rotulo="Resumo">
              <textarea rows={5} className={inputCls} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
            </Campo>
            <Campo rotulo="Destaques">
              <textarea rows={3} className={inputCls} value={form.destaques} onChange={(e) => setForm({ ...form, destaques: e.target.value })} />
            </Campo>
            <Campo rotulo="Próximos passos">
              <textarea rows={3} className={inputCls} value={form.proximos_passos} onChange={(e) => setForm({ ...form, proximos_passos: e.target.value })} />
            </Campo>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Salvar relatório
              </button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Cartao>
      )}
      {!form && erro && <Aviso tipo="erro">{erro}</Aviso>}
      {itens?.length === 0 && !form && <p className="text-texto-suave">Nenhum relatório ainda.</p>}

      <ul className="space-y-4">
        {itens?.map((r) => (
          <li key={r.id}>
            <Cartao className="space-y-3">
              <h3 className="titulo-sub">{nomeDoMes(r.mes.slice(0, 7))}</h3>
              {r.resumo && <p className="whitespace-pre-wrap">{r.resumo}</p>}
              {r.destaques && (
                <div>
                  <p className="eyebrow mb-1">Destaques</p>
                  <p className="whitespace-pre-wrap">{r.destaques}</p>
                </div>
              )}
              {r.proximos_passos && (
                <div>
                  <p className="eyebrow mb-1">Próximos passos</p>
                  <p className="whitespace-pre-wrap">{r.proximos_passos}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button className={btnSecundario} onClick={() => setForm({ id: r.id, mes: r.mes.slice(0, 7), resumo: r.resumo ?? '', destaques: r.destaques ?? '', proximos_passos: r.proximos_passos ?? '' })}>
                  Editar
                </button>
                {perfil?.papel === 'dona' && (
                  <button className={btnSecundario} onClick={() => void remover(r)}>
                    Apagar
                  </button>
                )}
              </div>
            </Cartao>
          </li>
        ))}
      </ul>
    </div>
  )
}
