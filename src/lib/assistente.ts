// Assistente: transforma o plano que a IA devolveu em ações seguras.
// A IA só SUGERE (nome da ação + dados). Aqui cada dado é conferido de novo (ids existem, valores e datas
// são válidos) e só depois de a dona confirmar é que gravamos, com o login dela (as regras de segurança valem).
import { dataDeHoje } from './datas'
import { supabase } from './supabase'
import { CATEGORIAS_DESPESA, CATEGORIAS_PESSOAL, FORMAS_PAGAMENTO, FORMATOS_ROTEIRO, STATUS_ROTEIRO } from './tipos'

export interface AcaoBruta {
  id: string
  nome: string
  entrada: unknown
}

export interface Contexto {
  hoje: string
  dia_semana: string
  clientes: { id: string; nome: string }[]
  eventos: { id: string; nome: string; data: string; categoria: string; valor_total: number }[]
  categorias_pessoal: string[]
}

export type AcaoPronta =
  | { ok: true; id: string; resumo: string; executar: () => Promise<string | null> }
  | { ok: false; id: string; motivo: string }

const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function dinheiro(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 1e9 ? Math.round(n * 100) / 100 : null
}

function dataValida(v: unknown, padrao = dataDeHoje()): string | null {
  const s = txt(v, 10)
  if (!s) return padrao
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s
}

function somarMesesIso(iso: string, n: number) {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1 + n, 1)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
}

export interface ParcelaPlano {
  descricao: string
  vencimento: string
  valor: number
}

// Divide o valor combinado de um evento em parcelas (em centavos, sem sobrar nem faltar).
export function planoParcelas(total: number, entrada: number, n: number, hoje: string, dataEvento: string): ParcelaPlano[] {
  const centavos = Math.round(total * 100)
  const ent = entrada > 0 && entrada < total ? Math.round(entrada * 100) : 0
  const resto = centavos - ent
  const qtd = Math.min(24, Math.max(1, Math.round(n) || 1))
  const lista: ParcelaPlano[] = []
  if (ent > 0) lista.push({ descricao: 'Entrada', vencimento: hoje, valor: ent / 100 })
  const base = Math.floor(resto / qtd)
  for (let i = 0; i < qtd; i += 1) {
    const valor = i === qtd - 1 ? resto - base * (qtd - 1) : base
    lista.push({
      descricao: qtd === 1 ? (ent > 0 ? 'Saldo' : 'Valor do evento') : `Parcela ${i + 1} de ${qtd}`,
      vencimento: qtd === 1 ? (dataEvento >= hoje ? dataEvento : hoje) : somarMesesIso(hoje, i + 1),
      valor: valor / 100,
    })
  }
  return lista
}

const resumoParcelas = (p: ParcelaPlano[]) =>
  p.length === 1 ? `${reais(p[0].valor)} até ${dmy(p[0].vencimento)}` : p.map((x) => `${x.descricao}: ${reais(x.valor)} em ${dmy(x.vencimento)}`).join('; ')

// Lê os clientes e eventos para a IA saber os nomes e ids certos.
export async function montarContexto(): Promise<Contexto> {
  const [c, e, p] = await Promise.all([
    supabase.from('clientes').select('id, nome').neq('status', 'encerrado').order('nome'),
    supabase.from('eventos').select('id, nome, data_evento, categoria').neq('status', 'cancelado').order('data_evento', { ascending: false }).limit(150),
    supabase.from('evento_parcelas').select('evento_id, valor'),
  ])
  const somas = new Map<string, number>()
  for (const x of (p.data as { evento_id: string; valor: number }[]) ?? []) somas.set(x.evento_id, (somas.get(x.evento_id) ?? 0) + Number(x.valor))
  const hoje = dataDeHoje()
  return {
    hoje,
    dia_semana: new Date(`${hoje}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' }),
    clientes: ((c.data as { id: string; nome: string }[]) ?? []).map((x) => ({ id: x.id, nome: x.nome })),
    eventos: ((e.data as { id: string; nome: string; data_evento: string; categoria: string | null }[]) ?? []).map((x) => ({
      id: x.id,
      nome: x.nome,
      data: x.data_evento,
      categoria: x.categoria ?? 'Evento',
      valor_total: somas.get(x.id) ?? 0,
    })),
    categorias_pessoal: [...CATEGORIAS_PESSOAL],
  }
}

const erro = (id: string, motivo: string): AcaoPronta => ({ ok: false, id, motivo })

// Confere uma ação sugerida pela IA e devolve o texto para a dona confirmar + a função que grava.
export async function prepararAcao(a: AcaoBruta, ctx: Contexto): Promise<AcaoPronta> {
  const e = (a.entrada ?? {}) as Record<string, unknown>
  const hoje = dataDeHoje()
  const cliente = (id: unknown) => ctx.clientes.find((c) => c.id === txt(id, 60))
  const evento = (id: unknown) => ctx.eventos.find((x) => x.id === txt(id, 60))

  switch (a.nome) {
    case 'adicionar_roteiro': {
      const titulo = txt(e.titulo, 120)
      const texto = txt(e.texto, 20000)
      if (!titulo || !texto) return erro(a.id, 'faltou o título ou o texto do roteiro')
      const alvoCli = e.alvo_tipo === 'cliente' ? cliente(e.alvo_id) : undefined
      const alvoEv = e.alvo_tipo === 'evento' ? evento(e.alvo_id) : undefined
      if (!alvoCli && !alvoEv) return erro(a.id, 'não achei esse cliente ou evento na lista')
      const formato = (FORMATOS_ROTEIRO as readonly string[]).includes(txt(e.formato, 20)) ? txt(e.formato, 20) : alvoEv ? 'evento' : 'reels'
      const status = (STATUS_ROTEIRO as readonly string[]).includes(txt(e.status, 20)) ? txt(e.status, 20) : 'rascunho'
      const data = txt(e.data_prevista, 10) ? dataValida(e.data_prevista, '') : null
      return {
        ok: true,
        id: a.id,
        resumo: `Guardar o roteiro "${titulo}" na aba Roteiros ${alvoCli ? `do cliente ${alvoCli.nome}` : `do evento ${alvoEv!.nome}`}${data ? ` (previsto para ${dmy(data)})` : ''}.`,
        executar: async () => {
          const { error } = await supabase.from('roteiros').insert({
            cliente_id: alvoCli?.id ?? null,
            evento_id: alvoEv?.id ?? null,
            titulo,
            texto,
            formato,
            status,
            data_prevista: data || null,
          })
          return error ? 'não foi possível salvar o roteiro' : null
        },
      }
    }

    case 'registrar_gasto': {
      const valor = dinheiro(e.valor)
      const descricao = txt(e.descricao, 150)
      const data = dataValida(e.data)
      if (!valor || !descricao || !data) return erro(a.id, 'faltou valor, descrição ou a data está inválida')
      const agencia = e.area === 'agencia'
      const cat = txt(e.categoria, 30).toLowerCase()
      const categoria = agencia
        ? (CATEGORIAS_DESPESA as readonly string[]).includes(cat) ? cat : 'outros'
        : (CATEGORIAS_PESSOAL as readonly string[]).includes(cat) ? cat : 'outros'
      return {
        ok: true,
        id: a.id,
        resumo: `Lançar gasto ${agencia ? 'da agência' : 'pessoal'}: ${reais(valor)} · ${descricao} · ${dmy(data)}.`,
        executar: async () => {
          const { error } = agencia
            ? await supabase.from('despesas').insert({ data, categoria, descricao, valor })
            : await supabase.from('financas_pessoais').insert({ data, tipo: 'saida', categoria, descricao, valor })
          return error ? 'não foi possível lançar o gasto' : null
        },
      }
    }

    case 'registrar_recebimento': {
      const valor = dinheiro(e.valor)
      const data = dataValida(e.data)
      if (!valor || !data) return erro(a.id, 'faltou o valor ou a data está inválida')
      const forma = (FORMAS_PAGAMENTO as readonly string[]).includes(txt(e.forma, 20)) ? txt(e.forma, 20) : null
      const descricao = txt(e.descricao, 150)

      if (e.alvo_tipo === 'pessoal') {
        return {
          ok: true,
          id: a.id,
          resumo: `Lançar entrada pessoal: ${reais(valor)}${descricao ? ` · ${descricao}` : ''} · ${dmy(data)}.`,
          executar: async () => {
            const { error } = await supabase.from('financas_pessoais').insert({ data, tipo: 'entrada', categoria: 'outros', descricao: descricao || 'Entrada', valor })
            return error ? 'não foi possível lançar a entrada' : null
          },
        }
      }

      if (e.alvo_tipo === 'cliente') {
        const cli = cliente(e.alvo_id)
        if (!cli) return erro(a.id, 'não achei esse cliente na lista')
        const fimMes = `${data.slice(0, 7)}-${String(new Date(Number(data.slice(0, 4)), Number(data.slice(5, 7)), 0).getDate()).padStart(2, '0')}`
        const { data: abertas } = await supabase
          .from('cobrancas')
          .select('id, descricao, valor, vencimento')
          .eq('cliente_id', cli.id)
          .neq('status', 'pago')
          .lte('vencimento', fimMes)
          .order('vencimento', { ascending: false })
          .limit(1)
        const cob = (abertas as { id: string; descricao: string; valor: number; vencimento: string }[] | null)?.[0]
        if (cob) {
          return {
            ok: true,
            id: a.id,
            resumo: `Marcar como recebido ${reais(valor)} de ${cli.nome} (cobrança "${cob.descricao}", combinada em ${reais(Number(cob.valor))}) em ${dmy(data)}.`,
            executar: async () => {
              const { error } = await supabase.from('cobrancas').update({ status: 'pago', pago_em: data, valor_recebido: valor, forma_pagamento: forma }).eq('id', cob.id)
              return error ? 'não foi possível registrar o recebimento' : null
            },
          }
        }
        return {
          ok: true,
          id: a.id,
          resumo: `Registrar recebimento de ${reais(valor)} de ${cli.nome} em ${dmy(data)} (não havia cobrança em aberto, então crio uma já paga).`,
          executar: async () => {
            const { error } = await supabase.from('cobrancas').insert({
              cliente_id: cli.id,
              descricao: descricao || 'Pagamento recebido',
              vencimento: data,
              valor,
              status: 'pago',
              pago_em: data,
              valor_recebido: valor,
              forma_pagamento: forma,
            })
            return error ? 'não foi possível registrar o recebimento' : null
          },
        }
      }

      if (e.alvo_tipo === 'evento') {
        const ev = evento(e.alvo_id)
        if (!ev) return erro(a.id, 'não achei esse evento na lista')
        const { data: abertas } = await supabase.from('evento_parcelas').select('id, descricao, valor').eq('evento_id', ev.id).neq('status', 'pago').order('vencimento')
        const lista = (abertas as { id: string; descricao: string; valor: number }[] | null) ?? []
        const igual = lista.find((p) => Math.abs(Number(p.valor) - valor) < 0.01)
        if (igual) {
          return {
            ok: true,
            id: a.id,
            resumo: `Marcar como paga a parcela "${igual.descricao}" (${reais(valor)}) do evento ${ev.nome} em ${dmy(data)}.`,
            executar: async () => {
              const { error } = await supabase.from('evento_parcelas').update({ status: 'pago', pago_em: data, forma_pagamento: forma }).eq('id', igual.id)
              return error ? 'não foi possível registrar o recebimento' : null
            },
          }
        }
        return {
          ok: true,
          id: a.id,
          resumo: `Registrar recebimento de ${reais(valor)} no evento ${ev.nome} em ${dmy(data)} (nenhuma parcela em aberto tem esse valor, então crio uma já paga).`,
          executar: async () => {
            const { error } = await supabase
              .from('evento_parcelas')
              .insert({ evento_id: ev.id, descricao: descricao || 'Pagamento recebido', vencimento: data, valor, status: 'pago', pago_em: data, forma_pagamento: forma })
            return error ? 'não foi possível registrar o recebimento' : null
          },
        }
      }
      return erro(a.id, 'não entendi de quem foi o recebimento')
    }

    case 'criar_evento':
    case 'definir_valor_evento': {
      const novo = a.nome === 'criar_evento'
      const existente = novo ? undefined : evento(e.evento_id)
      if (!novo && !existente) return erro(a.id, 'não achei esse evento na lista')
      const nome = novo ? txt(e.nome, 120) : existente!.nome
      const dataEvento = novo ? dataValida(e.data_evento, '') : existente!.data
      if (!nome || !dataEvento) return erro(a.id, 'faltou o nome ou a data do evento')
      const total = e.valor_total === undefined || e.valor_total === 0 ? 0 : dinheiro(e.valor_total)
      if (total === null) return erro(a.id, 'o valor do evento está inválido')
      if (!novo && total === 0) return erro(a.id, 'faltou o valor do evento')
      const entrada = dinheiro(e.entrada) ?? 0
      const parcelas = total > 0 ? planoParcelas(total, entrada, Number(e.numero_parcelas) || 1, hoje, dataEvento) : []
      const horario = /^\d{2}:\d{2}$/.test(txt(e.horario, 5)) ? txt(e.horario, 5) : null
      const categoria = txt(e.categoria, 60) || 'Evento'
      const resumo = novo
        ? `Criar o evento "${nome}" (${categoria}) em ${dmy(dataEvento)}${horario ? ` às ${horario}` : ''}${txt(e.local, 120) ? ` · ${txt(e.local, 120)}` : ''}${parcelas.length ? `. Valor ${reais(total)}: ${resumoParcelas(parcelas)}` : ''}.`
        : `Colocar o valor ${reais(total)} no evento ${nome}: ${resumoParcelas(parcelas)}.${existente!.valor_total > 0 ? ` Atenção: o evento já tem ${reais(existente!.valor_total)} em parcelas; estas entram além delas.` : ''}`
      return {
        ok: true,
        id: a.id,
        resumo,
        executar: async () => {
          let eventoId = existente?.id
          if (novo) {
            const { data: criado, error } = await supabase
              .from('eventos')
              .insert({
                nome,
                tipo: categoria.toLowerCase() === 'casamento' ? 'casamento' : 'evento',
                categoria,
                data_evento: dataEvento,
                horario,
                local: txt(e.local, 120) || null,
                contato: txt(e.contato, 120) || null,
              })
              .select('id')
              .single()
            if (error || !criado) return 'não foi possível criar o evento'
            eventoId = criado.id as string
          }
          if (parcelas.length) {
            const { error } = await supabase.from('evento_parcelas').insert(parcelas.map((p) => ({ evento_id: eventoId, descricao: p.descricao, vencimento: p.vencimento, valor: p.valor })))
            if (error) return novo ? 'o evento foi criado, mas não deu para colocar o valor' : 'não foi possível colocar o valor'
          }
          return null
        },
      }
    }

    case 'criar_tarefa': {
      const titulo = txt(e.titulo, 200)
      if (!titulo) return erro(a.id, 'faltou o título da tarefa')
      const cli = txt(e.cliente_id, 60) ? cliente(e.cliente_id) : undefined
      if (txt(e.cliente_id, 60) && !cli) return erro(a.id, 'não achei esse cliente na lista')
      const data = txt(e.data, 10) ? dataValida(e.data, '') : null
      return {
        ok: true,
        id: a.id,
        resumo: `Criar a tarefa "${titulo}"${cli ? ` para ${cli.nome}` : ''}${data ? ` até ${dmy(data)}` : ''}.`,
        executar: async () => {
          const { error } = await supabase.from('tarefas').insert({ titulo, data: data || null, tipo: 'tarefa', status: 'fazer', responsavel: 'agencia', visivel_cliente: false, cliente_id: cli?.id ?? null })
          return error ? 'não foi possível criar a tarefa' : null
        },
      }
    }

    case 'anotar_ideia': {
      const texto = txt(e.texto, 2000)
      if (!texto) return erro(a.id, 'faltou o texto da ideia')
      const cli = txt(e.cliente_id, 60) ? cliente(e.cliente_id) : undefined
      if (txt(e.cliente_id, 60) && !cli) return erro(a.id, 'não achei esse cliente na lista')
      return {
        ok: true,
        id: a.id,
        resumo: `Anotar a ideia "${texto.length > 90 ? `${texto.slice(0, 90)}…` : texto}"${cli ? ` para ${cli.nome}` : ' no banco de ideias'}.`,
        executar: async () => {
          const { error } = await supabase.from('ideias').insert({ texto, tipo: 'ideia_post', cliente_id: cli?.id ?? null, para_sontag: false, tags: [] })
          return error ? 'não foi possível anotar a ideia' : null
        },
      }
    }

    case 'criar_gasto_fixo': {
      const valor = dinheiro(e.valor)
      const nome = txt(e.nome, 120)
      if (!valor || !nome) return erro(a.id, 'faltou o nome ou o valor do gasto fixo')
      const area = e.area === 'agencia' ? 'agencia' : 'pessoal'
      const dia = Math.min(31, Math.max(1, Math.round(Number(e.dia_vencimento)) || 5))
      const totalParcelas = Math.round(Number(e.parcelas_total)) || 0
      const parcelado = totalParcelas >= 2
      const atual = parcelado ? Math.min(totalParcelas, Math.max(1, Math.round(Number(e.parcela_atual)) || 1)) : 1
      return {
        ok: true,
        id: a.id,
        resumo: `Cadastrar gasto fixo ${area === 'agencia' ? 'da agência' : 'pessoal'}: ${nome}, ${reais(valor)}, vence dia ${dia}, ${parcelado ? `parcelado em ${totalParcelas}x (este mês é a parcela ${atual})` : 'todo mês'}.`,
        executar: async () => {
          const inicio = `${somarMesesIso(`${hoje.slice(0, 7)}-01`, -(atual - 1))}`
          const { error } = await supabase
            .from('gastos_fixos')
            .insert({ area, nome, categoria: txt(e.categoria, 40) || 'Outros', valor, dia_vencimento: dia, mes_inicio: inicio, parcelas_total: parcelado ? totalParcelas : null })
          if (error) return 'não foi possível cadastrar o gasto fixo'
          await supabase.rpc('gerar_gastos_fixos', { p_area: area, p_mes: `${hoje.slice(0, 7)}-01` })
          return null
        },
      }
    }

    default:
      return erro(a.id, 'ação desconhecida')
  }
}
