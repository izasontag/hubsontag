import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Esqueleto } from '../../componentes/ui'
import { mesDeHoje } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import Avulsos from './Avulsos'
import Cobrancas from './Cobrancas'
import Contratos from './Contratos'
import Despesas from './Despesas'
import VisaoGeral from './VisaoGeral'

const ABAS = [
  ['visao', 'Visão geral'],
  ['cobrancas', 'Cobranças'],
  ['contratos', 'Contratos'],
  ['despesas', 'Despesas'],
  ['avulsos', 'Avulsos'],
] as const

export default function Agencia() {
  const [params, setParams] = useSearchParams()
  const [mes, setMes] = useState(mesDeHoje())
  const [pronto, setPronto] = useState(false)
  const pedida = params.get('aba')
  const aba = ABAS.some(([c]) => c === pedida) ? pedida! : 'visao'

  // antes de mostrar os números, o que venceu e não foi pago vira "atrasado"
  useEffect(() => {
    void supabase.rpc('marcar_atrasadas').then(() => setPronto(true))
  }, [])

  return (
    <div className="space-y-6">
      <nav className="flex gap-6 overflow-x-auto border-b border-linha" aria-label="Seções da agência">
        {ABAS.map(([chave, rotulo]) => (
          <button
            key={chave}
            onClick={() => setParams(chave === 'visao' ? {} : { aba: chave })}
            aria-current={aba === chave ? 'page' : undefined}
            className={`relative min-h-11 shrink-0 cursor-pointer px-1 text-sm tracking-wide transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-marrom after:transition-transform after:duration-300 ${
              aba === chave ? 'text-marrom after:scale-x-100' : 'text-texto-suave after:scale-x-0 hover:text-texto hover:after:scale-x-50'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </nav>
      {!pronto ? (
        <Esqueleto className="h-48" />
      ) : (
        <div key={aba} className="anim-entrar">
          {aba === 'visao' && <VisaoGeral mes={mes} onMes={setMes} />}
          {aba === 'cobrancas' && <Cobrancas mes={mes} onMes={setMes} />}
          {aba === 'contratos' && <Contratos />}
          {aba === 'despesas' && <Despesas mes={mes} onMes={setMes} />}
          {aba === 'avulsos' && <Avulsos />}
        </div>
      )}
    </div>
  )
}
