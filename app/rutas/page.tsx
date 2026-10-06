'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, MapPin, MessageCircle, Menu, Users } from 'lucide-react'
import dynamic from 'next/dynamic'
import { apiGet } from '@/lib/api'
import { bidonesUltimaEntregaPorCliente, calcularEstado, type Cliente, type EntregaBasica } from '@/lib/clientes'

// Carga dinámica obligatoria para Leaflet en Next.js
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

export default function RutasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [entregas, setEntregas] = useState<EntregaBasica[]>([])
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Todos')
  const [isLoading, setIsLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)

  useEffect(() => {
    Promise.all([
      apiGet<Cliente[]>('/clientes'),
      // Si las entregas fallan, el mapa se muestra igual con una estimación semanal
      apiGet<EntregaBasica[]>('/entregas/ultimas').catch(() => [])
    ])
      .then(([datosClientes, datosEntregas]) => {
        setClientes(datosClientes)
        setEntregas(datosEntregas)
      })
      .catch(err => {
        console.error('Error al cargar clientes:', err)
        setErrorCarga(true)
      })
      .finally(() => setIsLoading(false))
  }, [])

  // El color de cada marcador usa el mismo cálculo de nivel de agua que la pantalla de Ruta
  const clientesConEstado = useMemo(() => {
    const bidones = bidonesUltimaEntregaPorCliente(entregas)
    const ahora = new Date()
    return clientes.map(c => ({
      ...c,
      estado_agua: calcularEstado(c, bidones.get(c.id), ahora).status,
    }))
  }, [clientes, entregas])

  // Extraer barrios únicos de la BD
  const barrios = useMemo(
    () => ['Todos', ...new Set(clientes.flatMap(c => (c.barrio ? [c.barrio] : [])))],
    [clientes]
  )

  const clientesVisibles = selectedNeighborhood === 'Todos'
    ? clientesConEstado
    : clientesConEstado.filter(c => c.barrio === selectedNeighborhood)

  const clientesConCoords = clientesVisibles.filter(c => c.latitud && c.longitud).length

  if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando mapa...</div>
  if (errorCarga) return <div className="p-8 text-center text-slate-500">No se pudieron cargar los clientes.</div>

  return (
    <main className="min-h-screen bg-[#f7faff] pb-24 text-slate-900">
      <header className="border-b border-slate-200/70 bg-white sticky top-0 z-20">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">Aguas Mas</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Rutas en San Martín</h1>
          </div>
          <button className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-5 sm:px-8">
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Filtrar por barrio</label>
        <div className="relative">
          <select
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm font-semibold text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm z-10 relative">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Vista operativa</p>
              <h2 className="mt-0.5 text-base font-extrabold text-slate-900">Mapa de reparto</h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><MapPin className="size-4 text-sky-600" />En vivo</span>
          </div>
          
          {/* AQUÍ VA EL MAPA REAL */}
          <MapComponent clientes={clientesVisibles} />
          
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <h2 className="mb-3 text-sm font-extrabold text-slate-900">Estado de los clientes</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-start gap-2"><span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-red-500" /><span className="text-[11px] font-medium leading-4 text-slate-600">Urgente</span></div>
            <div className="flex items-start gap-2"><span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-amber-400" /><span className="text-[11px] font-medium leading-4 text-slate-600">Próximos</span></div>
            <div className="flex items-start gap-2"><span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-emerald-500" /><span className="text-[11px] font-medium leading-4 text-slate-600">Abastecido</span></div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Users className="size-5" /></span>
              <div>
                <p className="text-xs font-semibold text-slate-500">Ubicaciones guardadas</p>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{clientesConCoords} / {clientesVisibles.length}</p>
              </div>
            </div>
            <span className="text-right text-[11px] font-semibold leading-4 text-slate-400">{selectedNeighborhood}</span>
          </div>
          <button 
            onClick={() => alert('Próximamente: Integración con API de WhatsApp')}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(37,211,102,0.22)] transition hover:bg-[#20bd5b]"
          >
            <MessageCircle className="size-5" />Notificar a {clientesVisibles.length} clientes
          </button>
        </section>
      </div>
    </main>
  )
}
