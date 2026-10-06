// URL base del backend. Se puede sobrescribir con NEXT_PUBLIC_API_URL (por ejemplo, para apuntar a un backend local).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://envasadora-mas.onrender.com/api'

// GET que lanza un error si el servidor responde con un estado de error,
// así los .catch() de cada pantalla se enteran en lugar de intentar parsear una respuesta inválida.
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`Error ${res.status} en GET ${path}`)
  return res.json()
}

// POST / PUT / DELETE. Devuelve la Response para que cada pantalla decida qué mensaje mostrar.
export function apiSend(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
