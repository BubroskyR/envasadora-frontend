import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

// Toda respuesta del historial mensual trae el mes que se está mostrando ("2026-10")
// y el resumen de todos los meses, del más reciente al más antiguo (el primero es el mes actual).
export interface RespuestaMensual {
  mes: string;
  meses: { mes: string }[];
}

// Carga una sección del historial de finanzas (ej. '/finanzas/ingresos') para el mes elegido.
// Mientras no se elige ninguno, el backend devuelve el mes actual.
// Al cambiar de mes se siguen mostrando los datos anteriores hasta que llegan los nuevos.
export function useHistorialMensual<T extends RespuestaMensual>(ruta: string) {
  const [mesPedido, setMesPedido] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ pedido: string | null; datos?: T; error?: boolean } | null>(null)

  useEffect(() => {
    let vigente = true
    apiGet<T>(mesPedido ? `${ruta}?mes=${mesPedido}` : ruta)
      .then(datos => {
        if (vigente) setResultado({ pedido: mesPedido, datos })
      })
      .catch(err => {
        console.error(`Error al cargar ${ruta}:`, err)
        if (vigente) setResultado(prev => ({ pedido: mesPedido, datos: prev?.datos, error: true }))
      })
    return () => { vigente = false }
  }, [ruta, mesPedido])

  const cargando = resultado === null || resultado.pedido !== mesPedido
  return {
    datos: resultado?.datos,
    cargando,
    error: !cargando && Boolean(resultado?.error),
    seleccionarMes: setMesPedido,
  }
}
