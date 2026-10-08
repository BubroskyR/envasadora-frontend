// Utilidades para avisar a los clientes por WhatsApp abriendo el chat con el mensaje ya escrito (wa.me).
// No usa la API de WhatsApp: el mensaje sale desde el WhatsApp del teléfono, tocando "Enviar".

// Convierte un teléfono argentino cargado de cualquier forma al formato que pide WhatsApp para celulares:
// 54 (país) + 9 (celular) + código de área sin 0 + número sin 15. Ej.: "03725 15-412345" → "5493725412345".
// Si el número no trae código de área se completa con el de la zona (Ajustes).
// Devuelve null si no se puede armar un número válido (vacío, incompleto o con dígitos de más).
export function numeroWhatsApp(telefono: string | null | undefined, codigoArea: string): string | null {
  let d = (telefono ?? '').replace(/\D/g, '')
  if (!d) return null

  if (d.startsWith('00')) d = d.slice(2)                    // 0054... (prefijo internacional)
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2)  // código de país (ningún código de área empieza con 54)
  if (d.startsWith('9') && d.length === 11) d = d.slice(1)  // el 9 de celular de "+54 9 ..."
  if (d.startsWith('0')) d = d.slice(1)                     // el 0 de larga distancia

  // Código de área + 15 + número (12 dígitos): se saca el 15. Los códigos de área tienen 2, 3 o 4 dígitos.
  if (d.length === 12) {
    for (const largo of [4, 3, 2]) {
      if (d.slice(largo, largo + 2) === '15') {
        d = d.slice(0, largo) + d.slice(largo + 2)
        break
      }
    }
  }

  // Sin código de área (número local, con o sin 15): se completa con el de la zona.
  // Un número de 10 dígitos que empieza con 15 tampoco tiene código de área (ninguno empieza con 15).
  if (d.length < 10 || d.startsWith('15')) {
    if (d.startsWith('15')) d = d.slice(2)
    const area = codigoArea.replace(/\D/g, '').replace(/^0/, '')
    if (area && (area + d).length === 10) d = area + d
  }

  return d.length === 10 ? `549${d}` : null
}

// "5493725412345" → "+54 9 3725412345"
export function formatearNumero(numero: string): string {
  return `+54 9 ${numero.slice(3)}`
}

// Reemplaza {nombre} y {barrio} en el texto del aviso (sin importar mayúsculas)
export function armarMensaje(plantilla: string, datos: { nombre: string; barrio: string }): string {
  return plantilla
    .replace(/\{nombre\}/gi, datos.nombre.trim())
    .replace(/\{barrio\}/gi, datos.barrio.trim())
}

// Link que abre WhatsApp con el chat de ese número y el mensaje ya escrito
export function linkWhatsApp(numero: string, mensaje: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
