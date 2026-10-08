import { useSyncExternalStore } from 'react'

export const PRECIO_BIDON_DEFAULT = 2000
export const BARRIOS_DEFAULT = ['Centro', 'Villa San Martín', 'Las Flores', 'San José']
// Característica de General José de San Martín (Chaco), sin el 0.
// Se usa para completar los teléfonos cargados sin código de área al avisar por WhatsApp.
export const CODIGO_AREA_DEFAULT = '3725'

const KEY_PRECIO = 'precioBidon'
const KEY_BARRIOS = 'barriosRuta'
const KEY_CODIGO_AREA = 'codigoArea'
const EVENTO_CAMBIO = 'ajustes-cambiados'

export interface Ajustes {
  precioBidon: number;
  barrios: string[];
  codigoArea: string;
}

const AJUSTES_DEFAULT: Ajustes = { precioBidon: PRECIO_BIDON_DEFAULT, barrios: BARRIOS_DEFAULT, codigoArea: CODIGO_AREA_DEFAULT }

function parseBarrios(raw: string | null): string[] {
  if (!raw) return BARRIOS_DEFAULT
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : BARRIOS_DEFAULT
  } catch {
    // Por si estaban guardados como texto plano en versiones anteriores
    return BARRIOS_DEFAULT
  }
}

// useSyncExternalStore exige que el snapshot sea el mismo objeto mientras no cambie,
// así que lo cacheamos según el contenido crudo de localStorage.
let cacheRaw: string | null = null
let cacheAjustes: Ajustes = AJUSTES_DEFAULT

function getSnapshot(): Ajustes {
  const rawPrecio = localStorage.getItem(KEY_PRECIO)
  const rawBarrios = localStorage.getItem(KEY_BARRIOS)
  const rawCodigoArea = localStorage.getItem(KEY_CODIGO_AREA)
  const raw = `${rawPrecio}|${rawBarrios}|${rawCodigoArea}`
  if (raw !== cacheRaw) {
    cacheRaw = raw
    const precio = Number(rawPrecio)
    cacheAjustes = {
      precioBidon: rawPrecio && precio > 0 ? precio : PRECIO_BIDON_DEFAULT,
      barrios: parseBarrios(rawBarrios),
      codigoArea: rawCodigoArea || CODIGO_AREA_DEFAULT,
    }
  }
  return cacheAjustes
}

function subscribe(callback: () => void) {
  // 'storage' avisa de cambios hechos en otra pestaña; el evento propio, de cambios en esta.
  window.addEventListener('storage', callback)
  window.addEventListener(EVENTO_CAMBIO, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENTO_CAMBIO, callback)
  }
}

export function useAjustes(): Ajustes {
  return useSyncExternalStore(subscribe, getSnapshot, () => AJUSTES_DEFAULT)
}

export function guardarAjustes({ precioBidon, barrios, codigoArea }: Ajustes) {
  localStorage.setItem(KEY_PRECIO, precioBidon.toString())
  localStorage.setItem(KEY_BARRIOS, JSON.stringify(barrios))
  localStorage.setItem(KEY_CODIGO_AREA, codigoArea)
  window.dispatchEvent(new Event(EVENTO_CAMBIO))
}
