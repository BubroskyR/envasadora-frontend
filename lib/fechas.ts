const MS_POR_DIA = 1000 * 60 * 60 * 24

// El backend guarda las fechas sin hora (CURRENT_DATE) y llegan como "2026-09-26T00:00:00.000Z".
// Pasadas directo a new Date(), en Argentina (UTC-3) caen en el día anterior a las 21 hs.
// Por eso se toma solo la parte de la fecha y se interpreta como día local.
export function parseFecha(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Días de calendario completos entre la fecha dada y hoy (0 = hoy).
export function diasDesde(fecha: string, ahora: Date = new Date()): number {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  return Math.round((hoy.getTime() - parseFecha(fecha).getTime()) / MS_POR_DIA)
}
