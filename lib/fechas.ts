const MS_POR_DIA = 1000 * 60 * 60 * 24

// El backend guarda las fechas sin hora (CURRENT_DATE) y llegan como "2026-09-26T00:00:00.000Z".
// Pasadas directo a new Date(), en Argentina (UTC-3) caen en el día anterior a las 21 hs.
// Por eso se toma solo la parte de la fecha y se interpreta como día local.
export function parseFecha(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// "2026-10" → "Octubre 2026" (o "Oct 2026" con corto = true)
export function nombreMes(mes: string, corto = false): string {
  const [y, m] = mes.split('-').map(Number)
  const texto = new Date(y, m - 1, 15).toLocaleDateString('es-AR', { month: corto ? 'short' : 'long', year: 'numeric' })
  return (texto.charAt(0).toUpperCase() + texto.slice(1)).replace(' de ', ' ').replace('.', '')
}

// "2026-10-07" → "07 oct"
export function fechaCorta(fecha: string): string {
  return parseFecha(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '')
}

// Días de calendario completos entre la fecha dada y hoy (0 = hoy).
export function diasDesde(fecha: string, ahora: Date = new Date()): number {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  return Math.round((hoy.getTime() - parseFecha(fecha).getTime()) / MS_POR_DIA)
}
