'use client'

import { useState, useEffect } from 'react'
import { Save, Settings, DollarSign } from 'lucide-react'

export default function AjustesPage() {
  const [precio, setPrecio] = useState<number | ''>('')
  const [guardado, setGuardado] = useState(false)

  // Al abrir la pantalla, leemos el precio que estaba guardado
  useEffect(() => {
    const precioGuardado = localStorage.getItem('precioBidon')
    if (precioGuardado) {
      setPrecio(Number(precioGuardado))
    } else {
      setPrecio(2000) // Precio por defecto si nunca se guardó nada
    }
  }, [])

  // Al presionar guardar, lo escribimos en la memoria del celular
  const handleGuardar = () => {
    if (precio !== '') {
      localStorage.setItem('precioBidon', precio.toString())
      setGuardado(true)
      // El cartel de "Guardado" desaparece después de 3 segundos
      setTimeout(() => setGuardado(false), 3000)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900 pb-20">
      <header className="border-b border-slate-200/70 bg-white sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <Settings className="size-5" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Ajustes</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-6 sm:px-8">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Configuración General</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Precio global del bidón ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
              <input 
                type="number" 
                value={precio}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrecio(val === '' ? '' : Number(val));
                }}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all font-bold text-lg"
                placeholder="Ej. 2000"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Este precio se aplicará automáticamente a todas las nuevas entregas que registres.
            </p>
          </div>

          <button 
            onClick={handleGuardar}
            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 ${
              guardado 
                ? 'bg-emerald-500 shadow-emerald-500/30' 
                : 'bg-sky-600 shadow-sky-600/30 hover:bg-sky-700'
            }`}
          >
            <Save className="size-5" />
            {guardado ? '¡Precio Guardado!' : 'Guardar Precio'}
          </button>
        </section>
      </div>
    </main>
  )
}
