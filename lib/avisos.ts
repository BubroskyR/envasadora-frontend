import { useMemo, useSyncExternalStore } from 'react'

// Datos de "Avisar por WhatsApp" guardados en el teléfono (localStorage):
// - el texto del aviso, para no tener que escribirlo cada vez
// - a quiénes ya se les envió hoy en cada barrio. Al abrir WhatsApp, Android puede cerrar la app
//   en segundo plano; así, al volver, sigue marcado quién ya fue avisado.

export const MENSAJE_DEFAULT =
  '¡Hola {nombre}! 👋 Hoy pasamos por {barrio} con los bidones de Aguas Mas 💧 Si necesitás, respondé este mensaje y te dejamos tu pedido.'

const KEY_MENSAJE = 'avisoMensaje'
const PREFIJO_ENVIADOS = 'avisosEnviados:'
const EVENTO_CAMBIO = 'avisos-cambiados'

function leer(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function escribir(key: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(key)
    else localStorage.setItem(key, valor)
  } catch {
    // Sin almacenamiento (modo privado): el aviso funciona igual, solo no se recuerda el progreso
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO))
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENTO_CAMBIO, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENTO_CAMBIO, callback)
  }
}

function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const claveEnviados = (barrio: string) => `${PREFIJO_ENVIADOS}${hoy()}:${barrio.toLowerCase().trim()}`

// --- Texto del aviso ---

export function useMensajeAviso(): string {
  return useSyncExternalStore(subscribe, () => leer(KEY_MENSAJE) ?? MENSAJE_DEFAULT, () => MENSAJE_DEFAULT)
}

export function guardarMensajeAviso(texto: string) {
  escribir(KEY_MENSAJE, texto === MENSAJE_DEFAULT ? null : texto)
}

// --- Progreso del día: id del cliente → hora en que se abrió WhatsApp para avisarle ---

function leerEnviados(barrio: string): Record<string, string> {
  try {
    return JSON.parse(leer(claveEnviados(barrio)) ?? '{}')
  } catch {
    return {}
  }
}

export function useEnviadosHoy(barrio: string): Record<string, string> {
  // El snapshot es el texto crudo (se compara por valor); se convierte a objeto solo cuando cambia
  const raw = useSyncExternalStore(subscribe, () => leer(claveEnviados(barrio)) ?? '{}', () => '{}')
  return useMemo(() => {
    try {
      return JSON.parse(raw) as Record<string, string>
    } catch {
      return {}
    }
  }, [raw])
}

export function marcarEnviado(barrio: string, clienteId: number) {
  const enviados = leerEnviados(barrio)
  enviados[clienteId] = new Date().toISOString()
  escribir(claveEnviados(barrio), JSON.stringify(enviados))
}

export function desmarcarEnviado(barrio: string, clienteId: number) {
  const enviados = leerEnviados(barrio)
  delete enviados[clienteId]
  escribir(claveEnviados(barrio), JSON.stringify(enviados))
}

export function reiniciarEnviados(barrio: string) {
  escribir(claveEnviados(barrio), null)
}

// Borra el progreso de días anteriores para que no se acumule en el teléfono
export function limpiarAvisosViejos() {
  try {
    const actual = `${PREFIJO_ENVIADOS}${hoy()}:`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIJO_ENVIADOS) && !key.startsWith(actual)) localStorage.removeItem(key)
    }
  } catch {
    // sin almacenamiento: nada que limpiar
  }
}
