import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { montarContexto, prepararAcao } from '../lib/assistente'
import type { Contexto } from '../lib/assistente'
import { dataDeHoje } from '../lib/datas'
import { CATEGORIAS_DESPESA, CATEGORIAS_PESSOAL, CATEGORIA_DESPESA_ROTULO, CATEGORIA_PESSOAL_ROTULO, FORMA_ROTULO, FORMAS_PAGAMENTO } from '../lib/tipos'
import { useTravaRolagem } from '../lib/trava'
import NumInput from './NumInput'
import Portal from './Portal'
import { Aviso, btnPrimario, btnSecundario, Campo, inputCls } from './ui'

type Tipo = 'gasto' | 'recebimento' | 'roteiro' | 'evento' | 'valor_evento' | 'tarefa' | 'ideia'

const TIPOS: { chave: Tipo; rotulo: string; soDona?: boolean }[] = [
  { chave: 'gasto', rotulo: 'Gasto', soDona: true },
  { chave: 'recebimento', rotulo: 'Recebimento', soDona: true },
  { chave: 'roteiro', rotulo: 'Roteiro' },
  { chave: 'evento', rotulo: 'Evento novo', soDona: true },
  { chave: 'valor_evento', rotulo: 'Valor do evento', soDona: true },
  { chave: 'tarefa', rotulo: 'Tarefa' },
  { chave: 'ideia', rotulo: 'Ideia' },
]

interface Estado {
  area: 'pessoal' | 'agencia'
  descricao: string
  valor: number
  data: string
  categoria: string
  alvoTipo: 'cliente' | 'evento' | 'pessoal'
  alvoId: string
  forma: string
  titulo: string
  texto: string
  nome: string
  local: string
  tipoEvento: string
  entrada: number
  parcelas: number
}

const inicial = (): Estado => ({ area: 'pessoal', descricao: '', valor: 0, data: dataDeHoje(), categoria: 'outros', alvoTipo: 'cliente', alvoId: '', forma: '', titulo: '', texto: '', nome: '', local: '', tipoEvento: 'Casamento', entrada: 0, parcelas: 1 })

// Lançamento rápido: o mesmo que o assistente de IA faz, mas por formulário (sem custo, sem internet extra).
export default function LancamentoRapido({ dona, onFechar }: { dona: boolean; onFechar: () => void }) {
  const tipos = TIPOS.filter((t) => dona || !t.soDona)
  const [tipo, setTipo] = useState<Tipo>(tipos[0].chave)
  const [e, setE] = useState<Estado>(inicial())
  const [ctx, setCtx] = useState<Contexto | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [versao, setVersao] = useState(0)
  useTravaRolagem()

  useEffect(() => {
    void montarContexto().then(setCtx)
    const aoApertar = (ev: KeyboardEvent) => ev.key === 'Escape' && onFechar()
    document.addEventListener('keydown', aoApertar)
    return () => document.removeEventListener('keydown', aoApertar)
  }, [onFechar])

  const mudar = <K extends keyof Estado>(k: K, v: Estado[K]) => setE((x) => ({ ...x, [k]: v }))

  async function lancar(ev: FormEvent) {
    ev.preventDefault()
    if (!ctx) return
    setErro('')
    setOk('')
    const entrada: Record<string, unknown> =
      tipo === 'gasto' ? { area: e.area, descricao: e.descricao, valor: e.valor, data: e.data, categoria: e.categoria }
      : tipo === 'recebimento' ? { alvo_tipo: e.alvoTipo, alvo_id: e.alvoTipo === 'pessoal' ? '' : e.alvoId, valor: e.valor, data: e.data, descricao: e.descricao, forma: e.forma }
      : tipo === 'roteiro' ? { alvo_tipo: e.alvoTipo === 'evento' ? 'evento' : 'cliente', alvo_id: e.alvoId, titulo: e.titulo, texto: e.texto }
      : tipo === 'evento' ? { nome: e.nome, categoria: e.tipoEvento, data_evento: e.data, local: e.local, valor_total: e.valor, entrada: e.entrada, numero_parcelas: e.parcelas }
      : tipo === 'valor_evento' ? { evento_id: e.alvoId, valor_total: e.valor, entrada: e.entrada, numero_parcelas: e.parcelas }
      : tipo === 'tarefa' ? { titulo: e.titulo, data: e.data, cliente_id: e.alvoId }
      : { texto: e.texto, cliente_id: e.alvoId }
    const nomes: Record<Tipo, string> = { gasto: 'registrar_gasto', recebimento: 'registrar_recebimento', roteiro: 'adicionar_roteiro', evento: 'criar_evento', valor_evento: 'definir_valor_evento', tarefa: 'criar_tarefa', ideia: 'anotar_ideia' }
    setEnviando(true)
    const pronta = await prepararAcao({ id: 'rapido', nome: nomes[tipo], entrada }, ctx)
    if (!pronta.ok) {
      setEnviando(false)
      return setErro(`Confira os campos: ${pronta.motivo}.`)
    }
    const falha = await pronta.executar().catch(() => 'deu erro ao gravar')
    setEnviando(false)
    if (falha) return setErro(`Não foi possível gravar: ${falha}.`)
    setOk(pronta.resumo.replace(/^(Lançar|Guardar|Marcar|Registrar|Criar|Colocar|Anotar)/, (m) => ({ Lançar: 'Lançado:', Guardar: 'Guardado:', Marcar: 'Feito:', Registrar: 'Registrado:', Criar: 'Criado:', Colocar: 'Colocado:', Anotar: 'Anotado:' })[m] ?? m))
    void montarContexto().then(setCtx)
    // limpa só o que muda de um lançamento para o outro
    setE((x) => ({ ...inicial(), area: x.area, alvoTipo: x.alvoTipo, data: x.data }))
    setVersao((v) => v + 1)
  }

  const clientes = ctx?.clientes ?? []
  const eventos = ctx?.eventos ?? []
  const seletor = (rotulo: string, valor: string, lista: { id: string; nome: string }[], vazio: string) => (
    <Campo rotulo={rotulo}>
      <select className={inputCls} required={!vazio} value={valor} onChange={(x) => mudar('alvoId', x.target.value)}>
        <option value="">{vazio || 'Escolha...'}</option>
        {lista.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
    </Campo>
  )

  return (
    <Portal>
    <div className="modal-fundo fixed inset-0 z-50 flex items-end justify-center bg-texto/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Lançamento rápido" onMouseDown={(x) => x.target === x.currentTarget && onFechar()}>
      <form onSubmit={lancar} className="modal-painel flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[22px] border border-linha bg-superficie shadow-elevada sm:rounded-[22px]">
        <header className="flex items-center justify-between gap-3 border-b border-linha px-5 py-4">
          <div>
            <h2 className="font-titulo text-2xl font-semibold leading-none">Lançamento <em>rápido</em></h2>
            <p className="text-xs text-texto-suave">Escolha o que quer lançar e preencha. Grava na hora.</p>
          </div>
          <button type="button" className={btnSecundario} onClick={onFechar}>Fechar</button>
        </header>

        <div className="flex gap-2 overflow-x-auto px-5 py-3" role="tablist" aria-label="O que lançar">
          {tipos.map((t) => (
            <button key={t.chave} type="button" role="tab" aria-selected={tipo === t.chave} onClick={() => { setTipo(t.chave); setErro(''); setOk(''); setE((x) => ({ ...x, alvoId: '' })) }} className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm transition-colors ${tipo === t.chave ? 'border-azul bg-azul text-superficie' : 'border-linha text-texto-suave hover:bg-areia'}`}>
              {t.rotulo}
            </button>
          ))}
        </div>

        <div key={`${tipo}-${versao}`} className="anim-aparecer flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {tipo === 'gasto' && (
            <>
              <Campo rotulo="Onde foi o gasto">
                <select className={inputCls} value={e.area} onChange={(x) => { mudar('area', x.target.value as Estado['area']); mudar('categoria', 'outros') }}>
                  <option value="pessoal">Pessoal</option>
                  <option value="agencia">Agência</option>
                </select>
              </Campo>
              <Campo rotulo="O que foi"><input required autoFocus className={inputCls} maxLength={150} value={e.descricao} onChange={(x) => mudar('descricao', x.target.value)} placeholder="Ex.: Canva, mercado, internet" /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Valor (R$)"><NumInput rotulo="Valor do gasto" valor={e.valor} onChange={(n) => mudar('valor', n)} /></Campo>
                <Campo rotulo="Data"><input type="date" required className={inputCls} value={e.data} onChange={(x) => mudar('data', x.target.value)} /></Campo>
              </div>
              <Campo rotulo="Categoria">
                <select className={inputCls} value={e.categoria} onChange={(x) => mudar('categoria', x.target.value)}>
                  {e.area === 'agencia'
                    ? CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{CATEGORIA_DESPESA_ROTULO[c]}</option>)
                    : CATEGORIAS_PESSOAL.map((c) => <option key={c} value={c}>{CATEGORIA_PESSOAL_ROTULO[c]}</option>)}
                </select>
              </Campo>
            </>
          )}

          {tipo === 'recebimento' && (
            <>
              <Campo rotulo="De quem">
                <select className={inputCls} value={e.alvoTipo} onChange={(x) => { mudar('alvoTipo', x.target.value as Estado['alvoTipo']); mudar('alvoId', '') }}>
                  <option value="cliente">Cliente de social media</option>
                  <option value="evento">Cliente de evento</option>
                  <option value="pessoal">Entrada pessoal</option>
                </select>
              </Campo>
              {e.alvoTipo === 'cliente' && seletor('Cliente', e.alvoId, clientes, '')}
              {e.alvoTipo === 'evento' && seletor('Evento', e.alvoId, eventos, '')}
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Quanto recebeu (R$)"><NumInput rotulo="Valor recebido" valor={e.valor} onChange={(n) => mudar('valor', n)} /></Campo>
                <Campo rotulo="Data"><input type="date" required className={inputCls} value={e.data} onChange={(x) => mudar('data', x.target.value)} /></Campo>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Forma (opcional)">
                  <select className={inputCls} value={e.forma} onChange={(x) => mudar('forma', x.target.value)}>
                    <option value="">Não informar</option>
                    {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{FORMA_ROTULO[f]}</option>)}
                  </select>
                </Campo>
                {e.alvoTipo === 'pessoal' && <Campo rotulo="Descrição"><input className={inputCls} value={e.descricao} onChange={(x) => mudar('descricao', x.target.value)} placeholder="Ex.: freela" /></Campo>}
              </div>
              <p className="text-xs text-texto-suave">Se houver uma cobrança em aberto dessa pessoa, ela é marcada como recebida. Se não houver, é criada já paga.</p>
            </>
          )}

          {tipo === 'roteiro' && (
            <>
              <Campo rotulo="Para quem">
                <select className={inputCls} value={e.alvoTipo === 'evento' ? 'evento' : 'cliente'} onChange={(x) => { mudar('alvoTipo', x.target.value as Estado['alvoTipo']); mudar('alvoId', '') }}>
                  <option value="cliente">Cliente de social media</option>
                  <option value="evento">Evento</option>
                </select>
              </Campo>
              {e.alvoTipo === 'evento' ? seletor('Evento', e.alvoId, eventos, '') : seletor('Cliente', e.alvoId, clientes, '')}
              <Campo rotulo="Título"><input required className={inputCls} maxLength={120} value={e.titulo} onChange={(x) => mudar('titulo', x.target.value)} placeholder="Ex.: Reels de bastidores" /></Campo>
              <Campo rotulo="Roteiro"><textarea required className={`${inputCls} min-h-40`} value={e.texto} onChange={(x) => mudar('texto', x.target.value)} /></Campo>
            </>
          )}

          {tipo === 'evento' && (
            <>
              <Campo rotulo="Nome do evento ou do cliente"><input required autoFocus className={inputCls} maxLength={120} value={e.nome} onChange={(x) => mudar('nome', x.target.value)} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Tipo"><input className={inputCls} list="tipos-rapido" maxLength={60} value={e.tipoEvento} onChange={(x) => mudar('tipoEvento', x.target.value)} /><datalist id="tipos-rapido">{['Casamento', 'Aniversário', 'Debutante', 'Formatura', 'Corporativo', 'Batizado'].map((t) => <option key={t} value={t} />)}</datalist></Campo>
                <Campo rotulo="Data do evento"><input type="date" required className={inputCls} value={e.data} onChange={(x) => mudar('data', x.target.value)} /></Campo>
              </div>
              <Campo rotulo="Local (opcional)"><input className={inputCls} maxLength={120} value={e.local} onChange={(x) => mudar('local', x.target.value)} /></Campo>
              <div className="grid grid-cols-3 gap-3">
                <Campo rotulo="Valor (R$)"><NumInput rotulo="Valor do evento" valor={e.valor} onChange={(n) => mudar('valor', n)} /></Campo>
                <Campo rotulo="Entrada (R$)"><NumInput rotulo="Entrada do evento" valor={e.entrada} onChange={(n) => mudar('entrada', n)} /></Campo>
                <Campo rotulo="Parcelas"><NumInput rotulo="Parcelas do evento" valor={e.parcelas} onChange={(n) => mudar('parcelas', n)} /></Campo>
              </div>
              <p className="text-xs text-texto-suave">Deixe o valor em branco se ainda não foi combinado.</p>
            </>
          )}

          {tipo === 'valor_evento' && (
            <>
              {seletor('Evento', e.alvoId, eventos, '')}
              <div className="grid grid-cols-3 gap-3">
                <Campo rotulo="Valor (R$)"><NumInput rotulo="Valor do evento" valor={e.valor} onChange={(n) => mudar('valor', n)} /></Campo>
                <Campo rotulo="Entrada (R$)"><NumInput rotulo="Entrada do evento" valor={e.entrada} onChange={(n) => mudar('entrada', n)} /></Campo>
                <Campo rotulo="Parcelas"><NumInput rotulo="Parcelas do evento" valor={e.parcelas} onChange={(n) => mudar('parcelas', n)} /></Campo>
              </div>
              <p className="text-xs text-texto-suave">A entrada vence hoje; o restante, em parcelas mensais (ou de uma vez na data do evento).</p>
            </>
          )}

          {tipo === 'tarefa' && (
            <>
              <Campo rotulo="Tarefa"><input required autoFocus className={inputCls} maxLength={200} value={e.titulo} onChange={(x) => mudar('titulo', x.target.value)} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Até quando"><input type="date" className={inputCls} value={e.data} onChange={(x) => mudar('data', x.target.value)} /></Campo>
                {seletor('Cliente (opcional)', e.alvoId, clientes, 'Nenhum')}
              </div>
            </>
          )}

          {tipo === 'ideia' && (
            <>
              <Campo rotulo="Ideia"><textarea required autoFocus className={`${inputCls} min-h-28`} maxLength={2000} value={e.texto} onChange={(x) => mudar('texto', x.target.value)} /></Campo>
              {seletor('Cliente (opcional)', e.alvoId, clientes, 'Nenhum')}
            </>
          )}

          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {ok && <Aviso tipo="ok">{ok}</Aviso>}
        </div>

        <footer className="flex flex-wrap gap-3 border-t border-linha px-5 py-4">
          <button className={btnPrimario} disabled={enviando || !ctx}>{enviando ? 'Gravando…' : 'Lançar'}</button>
          <button type="button" className={btnSecundario} onClick={onFechar}>Pronto</button>
        </footer>
      </form>
    </div>
    </Portal>
  )
}
