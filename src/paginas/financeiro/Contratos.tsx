import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje } from '../../lib/datas'
import { numero, reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import type { Contrato } from '../../lib/tipos'

interface ClienteMin {
  id: string
  nome: string
}
interface Rascunho {
  id: string | null
  cliente_id: string
  plano: string
  posts_mes: string
  reels_mes: string
  stories_mes: string
  valor_mensal: string
  dia_vencimento: string
  inicio: string
  renovacao: string
}

const LIMITE = 50 * 1024 * 1024
const somarDias = (data: string, dias: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const n = new Date(a, m - 1, d + dias)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function Contratos() {
  const [itens, setItens] = useState<Contrato[] | null>(null)
  const [clientes, setClientes] = useState<ClienteMin[]>([])
  const [form, setForm] = useState<Rascunho | null>(null)
  const [gerando, setGerando] = useState<{ id: string; meses: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const hoje = dataDeHoje()

  const carregar = useCallback(async () => {
    const [c, k] = await Promise.all([
      supabase.from('contratos').select('*, cliente:clientes(nome)').order('status').order('inicio', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    if (c.error) return setErro('Não foi possível carregar os contratos.')
    setItens(c.data as Contrato[])
    setClientes((k.data as ClienteMin[]) ?? [])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = {
      cliente_id: form.cliente_id,
      plano: form.plano.trim(),
      posts_mes: Math.round(numero(form.posts_mes)),
      reels_mes: Math.round(numero(form.reels_mes)),
      stories_mes: Math.round(numero(form.stories_mes)),
      valor_mensal: numero(form.valor_mensal),
      dia_vencimento: Math.min(31, Math.max(1, Math.round(numero(form.dia_vencimento)) || 10)),
      inicio: form.inicio,
      renovacao: form.renovacao || null,
    }
    const { error } = form.id ? await supabase.from('contratos').update(campos).eq('id', form.id) : await supabase.from('contratos').insert(campos)
    if (error) return setErro('Não foi possível salvar o contrato.')
    setForm(null)
    void carregar()
  }

  async function gerar(e: FormEvent) {
    e.preventDefault()
    if (!gerando) return
    setErro('')
    setMsg('')
    const { data, error } = await supabase.rpc('gerar_cobrancas', { p_contrato: gerando.id, p_meses: Math.round(numero(gerando.meses)) })
    if (error) return setErro('Não foi possível gerar as cobranças. Use de 1 a 36 meses.')
    setGerando(null)
    setMsg(`${data as number} cobranças criadas. As que já existiam não foram repetidas. Veja na aba Cobranças.`)
  }

  async function anexar(c: Contrato, arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    if (arquivo.size > LIMITE) return setErro('O arquivo passa de 50 MB.')
    const extensao = (arquivo.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
    const caminho = `${c.id}/${crypto.randomUUID()}.${extensao}`
    const envio = await supabase.storage.from('contratos').upload(caminho, arquivo, { contentType: arquivo.type || undefined })
    if (envio.error) return setErro('Não foi possível enviar o arquivo.')
    const { error } = await supabase.from('contratos').update({ arquivo_storage: caminho }).eq('id', c.id)
    if (error) {
      await supabase.storage.from('contratos').remove([caminho])
      return setErro('Não foi possível registrar o arquivo.')
    }
    if (c.arquivo_storage) await supabase.storage.from('contratos').remove([c.arquivo_storage])
    void carregar()
  }

  async function abrirArquivo(c: Contrato) {
    if (!c.arquivo_storage) return
    const { data } = await supabase.storage.from('contratos').createSignedUrl(c.arquivo_storage, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
    else setErro('Não foi possível abrir o arquivo.')
  }

  async function mudarStatus(c: Contrato) {
    await supabase.from('contratos').update({ status: c.status === 'ativo' ? 'encerrado' : 'ativo' }).eq('id', c.id)
    void carregar()
  }

  async function remover(c: Contrato) {
    if (!window.confirm('Apagar este contrato e todas as cobranças ligadas a ele? Não dá para desfazer.')) return
    if (c.arquivo_storage) await supabase.storage.from('contratos').remove([c.arquivo_storage])
    await supabase.from('contratos').delete().eq('id', c.id)
    void carregar()
  }

  const ativos = (itens ?? []).filter((c) => c.status === 'ativo')
  const campo = (rotulo: string, chave: keyof Rascunho, tipo = 'text', extra: Record<string, string | boolean> = {}) =>
    form && (
      <Campo rotulo={rotulo}>
        <input type={tipo} className={inputCls} value={form[chave] ?? ''} onChange={(e) => setForm({ ...form, [chave]: e.target.value })} {...extra} />
      </Campo>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto-suave">
          {ativos.length} contratos ativos · <strong className="font-medium text-texto">{reais(soma(ativos, (c) => Number(c.valor_mensal)))}</strong> por mês
        </p>
        <button
          className={btnPrimario}
          onClick={() => setForm({ id: null, cliente_id: clientes[0]?.id ?? '', plano: '', posts_mes: '', reels_mes: '', stories_mes: '', valor_mensal: '', dia_vencimento: '10', inicio: hoje, renovacao: '' })}
        >
          Novo contrato
        </button>
      </div>

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar contrato' : 'Novo contrato'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Cliente">
                <select required className={inputCls} value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              {campo('Plano', 'plano', 'text', { required: true })}
              {campo('Valor mensal (R$)', 'valor_mensal', 'number', { required: true, step: '0.01', min: '0' })}
              {campo('Dia do vencimento (1 a 31)', 'dia_vencimento', 'number', { min: '1', max: '31' })}
              {campo('Início', 'inicio', 'date', { required: true })}
              {campo('Renovação ou término', 'renovacao', 'date')}
            </div>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-1 text-sm text-texto-suave">Escopo por mês</legend>
              {campo('Posts', 'posts_mes', 'number', { min: '0' })}
              {campo('Reels', 'reels_mes', 'number', { min: '0' })}
              {campo('Stories', 'stories_mes', 'number', { min: '0' })}
            </fieldset>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Salvar
              </button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Cartao>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {itens === null && !erro && <p className="anim-respirar text-texto-suave">Carregando...</p>}
      {itens?.length === 0 && <p className="text-texto-suave">Nenhum contrato cadastrado ainda.</p>}

      <ul className="space-y-4">
        {itens?.map((c) => {
          const vencendo = c.status === 'ativo' && c.renovacao && c.renovacao <= somarDias(hoje, 30)
          return (
            <li key={c.id} className={`space-y-4 rounded-md border bg-superficie p-5 shadow-suave ${c.status === 'encerrado' ? 'border-linha opacity-70' : vencendo ? 'border-marrom' : 'border-linha'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-titulo text-xl font-semibold">{c.cliente?.nome ?? 'Cliente'}</p>
                  <p className="text-sm text-texto-suave">
                    {c.plano} · {c.posts_mes} posts, {c.reels_mes} reels, {c.stories_mes} stories por mês
                  </p>
                </div>
                <div className="text-right">
                  <p className="numeros-grandes text-2xl font-medium">{reais(Number(c.valor_mensal))}</p>
                  <p className="text-xs text-texto-suave">vence todo dia {c.dia_vencimento}</p>
                </div>
              </div>
              <p className="text-sm text-texto-suave">
                Início {formatarData(c.inicio)}
                {c.renovacao && ` · renovação ${formatarData(c.renovacao)}`}
                {c.status === 'encerrado' && ' · encerrado'}
                {vencendo && <strong className="font-medium text-marrom"> · {c.renovacao && c.renovacao < hoje ? 'vencido' : 'vence em breve'}</strong>}
              </p>

              {gerando?.id === c.id ? (
                <form onSubmit={gerar} className="flex flex-wrap items-end gap-3 rounded-sm bg-fundo p-3">
                  <Campo rotulo="Quantos meses gerar (1 a 36)">
                    <input type="number" min="1" max="36" required className={inputCls} value={gerando.meses} onChange={(e) => setGerando({ ...gerando, meses: e.target.value })} />
                  </Campo>
                  <button type="submit" className={btnPrimario}>
                    Gerar cobranças
                  </button>
                  <button type="button" className={btnSecundario} onClick={() => setGerando(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {c.status === 'ativo' && (
                    <button className={btnPrimario} onClick={() => setGerando({ id: c.id, meses: '12' })}>
                      Gerar cobranças mensais
                    </button>
                  )}
                  {c.arquivo_storage && (
                    <button className={btnSecundario} onClick={() => void abrirArquivo(c)}>
                      Ver contrato assinado
                    </button>
                  )}
                  <label className={`${btnSecundario} focus-within:ring-2 focus-within:ring-marrom`}>
                    {c.arquivo_storage ? 'Trocar arquivo' : 'Anexar contrato'}
                    <input type="file" className="sr-only" onChange={(e) => { void anexar(c, e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                  <button
                    className={btnSecundario}
                    onClick={() =>
                      setForm({
                        id: c.id,
                        cliente_id: c.cliente_id,
                        plano: c.plano,
                        posts_mes: String(c.posts_mes),
                        reels_mes: String(c.reels_mes),
                        stories_mes: String(c.stories_mes),
                        valor_mensal: String(c.valor_mensal),
                        dia_vencimento: String(c.dia_vencimento),
                        inicio: c.inicio,
                        renovacao: c.renovacao ?? '',
                      })
                    }
                  >
                    Editar
                  </button>
                  <button className={btnSecundario} onClick={() => void mudarStatus(c)}>
                    {c.status === 'ativo' ? 'Encerrar' : 'Reativar'}
                  </button>
                  <button className={btnSecundario} onClick={() => void remover(c)}>
                    Apagar
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
