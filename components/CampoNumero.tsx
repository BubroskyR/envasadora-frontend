'use client'

import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | ''
  onValueChange: (valor: number | '') => void
}

// Campo para números enteros (precios, montos, bidones).
// - Se puede dejar vacío: borrar no deja un 0 pegado que después haya que sacar.
// - Al tocarlo se selecciona el número actual, así se escribe el nuevo directamente.
// - En el celular abre el teclado numérico y no acepta letras, puntos ni signos.
// - Usa type="text" para que la rueda del mouse no cambie el valor sin querer.
export function CampoNumero({ value, onValueChange, onFocus, ...props }: Props) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onFocus={(e) => {
        e.currentTarget.select()
        onFocus?.(e)
      }}
      onChange={(e) => {
        const soloDigitos = e.target.value.replace(/\D/g, '')
        // Number() también descarta los ceros a la izquierda ("03000" → 3000)
        onValueChange(soloDigitos === '' ? '' : Number(soloDigitos))
      }}
    />
  )
}
