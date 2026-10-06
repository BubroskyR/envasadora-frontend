'use client'

import { useState } from 'react'
import { Save, Settings, DollarSign, MapPin, Plus, X, LogOut } from 'lucide-react'
import { CampoNumero } from '@/components/CampoNumero'
import { guardarAjustes, useAjustes } from '@/lib/ajustes'
import { cerrarSesion } from '@/lib/api'

export default function AjustesPage() {
  const ajustes = useAjustes()

  // Borradores locales: mientras el usuario no edite (null), se muestran los valores guardados.
  const [precioDraft, setPrecioDraft] = useState<number | '' | null>(null)
  const [barriosDraft, setBarriosDraft] = useState<string[] | null>(null)
  const precio = precioDraft ?? ajustes.precioBidon
  const barrios = barriosDraft ?? ajustes.barrios

  const [nuevoBarrio, setNuevoBarrio] = useState('')
  const [guardado, setGuardado] = useState(false)

  // Agregar un barrio a la lista temporal
  const handleAgregarBarrio = (e: React.FormEvent) => {
    e.preventDefault()
    const nombreLimpio = nuevoBarrio.trim()
    if (!nombreLimpio) return
    if (!barrios.includes(nombreLimpio)) {
      setBarriosDraft([...barrios, nombreLimpio])
    }
    setNuevoBarrio('')
  }

  // Eliminar un barrio de la lista
  const handleEliminarBarrio = (barrioAEliminar: string) => {
    setBarriosDraft(barrios.filter(b => b !== barrioAEliminar))
  }

  // Guardar todo en localStorage
  const handleGuardar = () => {
    guardarAjustes({
      // Si el campo de precio quedó vacío o inválido, se conserva el precio anterior
      precioBidon: precio !== '' && precio > 0 ? precio : ajustes.precioBidon,
      barrios,
    })
    setPrecioDraft(null)
    setBarriosDraft(null)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
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

      <div className="mx-auto max-w-2xl px-5 pt-6 sm:px-8 space-y-6">
        {/* SECCIÓN 1: PRECIO GLOBAL */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Configuración General</h2>
          
          <div className="mb-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Precio global del bidón ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
              <CampoNumero
                aria-label="Precio global del bidón"
                value={precio}
                onValueChange={setPrecioDraft}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all font-bold text-lg"
                placeholder="Ej. 2000"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Este precio se aplicará automáticamente a todas las nuevas entregas que registres.
            </p>
          </div>
        </section>

        {/* SECCIÓN 2: ADMINISTRADOR DE BARRIOS INTERACTIVO */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Barrios de Reparto</h2>
          <p className="text-xs text-slate-500 mb-4">
            Agrega o elimina los barrios que aparecerán en el selector de la ruta principal.
          </p>

          {/* Formulario para agregar barrio */}
          <form onSubmit={handleAgregarBarrio} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                value={nuevoBarrio}
                onChange={(e) => setNuevoBarrio(e.target.value)}
                placeholder="Nombre del barrio..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none text-sm font-medium"
              />
            </div>
            <button 
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-600/20 hover:bg-sky-700 transition"
            >
              <Plus className="size-4" />
              Agregar
            </button>
          </form>

          {/* Lista de barrios en formato de etiquetas (Chips) */}
          <div className="flex flex-wrap gap-2 pt-2">
            {barrios.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay barrios cargados aún.</p>
            ) : (
              barrios.map((b) => (
                <span 
                  key={b} 
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700 shadow-sm"
                >
                  {b}
                  <button 
                    type="button"
                    onClick={() => handleEliminarBarrio(b)}
                    className="text-sky-400 hover:text-rose-600 transition"
                    aria-label={`Eliminar ${b}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

        <button 
          onClick={handleGuardar}
          className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 ${
            guardado 
              ? 'bg-emerald-500 shadow-emerald-500/30' 
              : 'bg-sky-600 shadow-sky-600/30 hover:bg-sky-700'
          }`}
        >
          <Save className="size-5" />
          {guardado ? '¡Configuración Guardada!' : 'Guardar Cambios'}
        </button>

        <button
          onClick={cerrarSesion}
          className="w-full py-3.5 font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all flex justify-center items-center gap-2"
        >
          <LogOut className="size-5" />
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}