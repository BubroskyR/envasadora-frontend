// URL base del backend. Se puede sobrescribir con NEXT_PUBLIC_API_URL (por ejemplo, para apuntar a un backend local).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://envasadora-mas.onrender.com/api'

import { useSyncExternalStore } from 'react'

// --- Sesión ---
// El backend devuelve un token al iniciar sesión; se guarda en el teléfono y se manda en cada petición.
const KEY_TOKEN = 'envasadora_token'
const EVENTO_SESION = 'sesion-cambiada'

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY_TOKEN)
  } catch {
    return null
  }
}

function subscribeSesion(callback: () => void) {
  // 'storage' avisa de cambios hechos en otra pestaña; el evento propio, de cambios en esta.
  window.addEventListener('storage', callback)
  window.addEventListener(EVENTO_SESION, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENTO_SESION, callback)
  }
}

// true/false según haya sesión; null mientras se renderiza en el servidor (ahí no existe localStorage).
export function useSesion(): boolean | null {
  return useSyncExternalStore(subscribeSesion, () => Boolean(getToken()), () => null)
}

export function cerrarSesion() {
  try {
    localStorage.removeItem(KEY_TOKEN)
  } catch {}
  window.dispatchEvent(new Event(EVENTO_SESION))
  window.location.replace('/login')
}

// Devuelve null si salió bien, o el mensaje de error para mostrar.
export async function login(password: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.token) return data.error ?? 'No se pudo iniciar sesión'
    localStorage.setItem(KEY_TOKEN, data.token)
    window.dispatchEvent(new Event(EVENTO_SESION))
    return null
  } catch {
    return 'Error de conexión con el servidor'
  }
}

function headersConToken(extra?: Record<string, string>): HeadersInit {
  const token = getToken()
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

// Si el servidor dice que la sesión no es válida (vencida o contraseña cambiada), se vuelve al login.
function verificarSesion(res: Response) {
  if (res.status === 401) cerrarSesion()
}

// GET que lanza un error si el servidor responde con un estado de error,
// así los .catch() de cada pantalla se enteran en lugar de intentar parsear una respuesta inválida.
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: headersConToken() })
  verificarSesion(res)
  if (!res.ok) throw new Error(`Error ${res.status} en GET ${path}`)
  return res.json()
}

// POST / PUT / DELETE. Devuelve la Response para que cada pantalla decida qué mensaje mostrar.
export async function apiSend(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: headersConToken(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  verificarSesion(res)
  return res
}
