'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Droplets, LogIn } from 'lucide-react'
import { login } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    const mensajeError = await login(password)
    if (mensajeError) {
      setError(mensajeError)
      setIsSubmitting(false)
      return
    }
    router.replace('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7faff] px-5 text-slate-900">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Droplets aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">Aguas Mas</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Iniciar sesión</h1>

        <label htmlFor="password" className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
        />

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !password}
          className="mt-6 w-full py-3.5 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 hover:bg-sky-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
        >
          <LogIn aria-hidden="true" className="size-5" />
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
