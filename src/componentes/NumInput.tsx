import { useState } from 'react'
import { inputCls } from './ui'
import { numero } from '../lib/dinheiro'

// Campo de número que aceita vírgula ("1,5") e deixa digitar à vontade.
// Troque a `key` para recarregar o valor de fora.
export default function NumInput({
  valor,
  onChange,
  rotulo,
  className = '',
  passo = 'any',
}: {
  valor: number
  onChange: (n: number) => void
  rotulo: string
  className?: string
  passo?: string
}) {
  const [texto, setTexto] = useState(valor ? String(valor).replace('.', ',') : '')
  return (
    <input
      aria-label={rotulo}
      inputMode="decimal"
      data-passo={passo}
      className={`${inputCls} ${className}`}
      value={texto}
      placeholder="0"
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '')
        setTexto(t)
        onChange(Math.max(0, numero(t)))
      }}
    />
  )
}
