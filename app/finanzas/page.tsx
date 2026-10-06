'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Fuel,
  Menu,
  ReceiptText,
  Users,
  Wallet,
  X
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, ResponsiveContainer } from 'recharts'
import { apiGet, apiSend } from '@/lib/api'
import { money } from '@/lib/clientes'
import { parseFecha } from '@/lib/fechas'

// Lo calcula el backend en /finanzas/resumen (los montos llegan como texto, igual que el resto de la API)
interface Movimiento {
  id: string;
  tipo: 'gasto' | 'venta' | 'cobro';
  fecha: string;
  monto: string;
  categoria: string | null;
  descripcion: string | null;
  cliente_nombre: string | null;
}

interface ResumenFinanzas {
  clientes_activos: number;
  clientes_con_deuda: number;
  dinero_en_la_calle: string;
  gastos_del_mes: string;
  ingresos_del_mes: string;
  grafico: { mes: string; ingresos: string }[];
  movimientos: Movimiento[];
}

const conceptoDe = (m: Movimiento) => {
  if (m.tipo === 'gasto') return `Gasto · ${m.categoria || 'Varios'}${m.descripcion ? ` (${m.descripcion})` : ''}`
  if (m.tipo === 'venta') return `Venta · ${m.cliente_nombre || 'Cliente'}`
  return `Cobro deuda · ${m.cliente_nombre || 'Cliente'}`
}

export default function Page() {
  const [resumen, setResumen] = useState<ResumenFinanzas | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)

  // Estados para el Modal de Gastos actualizados
  const [isGastoOpen, setIsGastoOpen] = useState(false)
  const [gastoForm, setGastoForm] = useState({ categoria: '', monto: '', comentario: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cargarDatos = useCallback(() => {
    // Antes se descargaban todos los clientes, gastos, entregas y pagos para sumarlos acá;
    // ahora el backend devuelve solo los totales, el gráfico y los últimos movimientos.
    apiGet<ResumenFinanzas>('/finanzas/resumen').then((data) => {
      setResumen(data)
      setErrorCarga(false)
    }).catch(err => {
      console.error("Error cargando dashboard:", err)
      setErrorCarga(true)
    }).finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const handleRegistrarGasto = async () => {
    setIsSubmitting(true)
    try {
      const response = await apiSend('/gastos', 'POST', {
        categoria: gastoForm.categoria,
        monto: Number(gastoForm.monto),
        descripcion: gastoForm.comentario // Enviamos el comentario como descripción
      });
      if (response.ok) {
        setIsGastoOpen(false)
        setGastoForm({ categoria: '', monto: '', comentario: '' })
        cargarDatos()
      } else {
        alert("Error al registrar el gasto")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error de conexión")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 bg-[#f7faff]">Calculando finanzas...</div>
  }

  if (errorCarga || !resumen) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 bg-[#f7faff]">No se pudieron cargar las finanzas.</div>
  }

  // --- GRÁFICO (Últimos 6 meses, ya agrupados por el backend) ---
  const chartData = resumen.grafico.map(({ mes, ingresos }) => {
    const name = parseFecha(mes).toLocaleDateString('es-AR', { month: 'short' })
    return { month: name.charAt(0).toUpperCase() + name.slice(1), income: Number(ingresos) }
  })

  // --- MOVIMIENTOS RECIENTES ---
  const movimientos = resumen.movimientos.map(m => ({
    id: m.id,
    date: parseFecha(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
    concept: conceptoDe(m),
    amount: Number(m.monto),
    type: m.tipo === 'gasto' ? 'expense' : 'income',
  }))

  const metrics = [
    { label: 'Dinero en la calle', value: money(Number(resumen.dinero_en_la_calle)), detail: `${resumen.clientes_con_deuda} cuentas pendientes`, icon: Wallet, tone: 'border-orange-100 bg-orange-50 text-orange-600', valueTone: 'text-orange-600' },
    { label: 'Ingresos del mes', value: money(Number(resumen.ingresos_del_mes)), detail: 'Suma de ventas y abonos', icon: ArrowDownLeft, tone: 'border-emerald-100 bg-emerald-50 text-emerald-600', valueTone: 'text-emerald-600' },
    { label: 'Gastos del mes', value: money(Number(resumen.gastos_del_mes)), detail: 'Operativos e insumos', icon: Fuel, tone: 'border-slate-200 bg-slate-50 text-slate-600', valueTone: 'text-slate-900' },
    { label: 'Clientes activos', value: resumen.clientes_activos.toString(), detail: 'En tu base de datos', icon: Users, tone: 'border-sky-100 bg-sky-50 text-sky-600', valueTone: 'text-slate-900' },
  ]

  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900 pb-20">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">Aguas Mas</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Resumen Financiero</h1>
          </div>
          <button aria-label="Abrir menú" className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50">
            <Menu aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-6 sm:px-8 sm:pt-8">
        <section aria-label="Métricas financieras" className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,0.05)] sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="max-w-[135px] text-xs font-semibold leading-4 text-slate-500">{metric.label}</p>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${metric.tone}`}><Icon aria-hidden="true" className="size-4" /></span>
                </div>
                <p className={`mt-4 text-2xl font-extrabold tracking-tight ${metric.valueTone}`}>{metric.value}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">{metric.detail}</p>
              </article>
            )
          })}
        </section>

        <section aria-labelledby="income-chart-title" className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Tendencia</p>
              <h2 id="income-chart-title" className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">Ingresos históricos</h2>
            </div>
          </div>
          <div className="mt-4 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={8} />
                <Tooltip cursor={{ fill: '#f0fdf4' }} contentStyle={{ borderRadius: 12, border: '1px solid #dbeafe', boxShadow: '0 6px 18px rgba(15,23,42,0.08)', fontSize: 12 }} formatter={(value) => [money(Number(value)), 'Ingresos']} />
                <Bar dataKey="income" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-sky-600 p-4 shadow-lg shadow-sky-600/20 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-100">Acción rápida</p>
              <h2 className="mt-1 text-lg font-extrabold text-white">¿Tuviste un gasto?</h2>
              <p className="mt-1 text-xs text-sky-100">Regístralo para mantener tus cuentas al día.</p>
            </div>
            <button 
              onClick={() => setIsGastoOpen(true)}
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm transition hover:bg-sky-50 active:scale-95" 
            >
              <ReceiptText aria-hidden="true" className="size-6" />
            </button>
          </div>
          <button 
            onClick={() => setIsGastoOpen(true)}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-sky-400 active:scale-95"
          >
            <ReceiptText aria-hidden="true" className="size-4" />
            Registrar Gasto
          </button>
        </section>

        <section className="mt-7" aria-labelledby="movements-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Actividad reciente</p>
              <h2 id="movements-title" className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Últimos movimientos</h2>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
            {movimientos.length === 0 ? (
               <div className="p-6 text-center text-sm text-slate-500">Aún no hay ingresos ni gastos registrados.</div>
            ) : (
              movimientos.map((movement, index) => {
                const income = movement.type === 'income'
                return (
                  <div key={movement.id} className={`flex items-center gap-3 px-4 py-3 ${index < movimientos.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${income ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {income ? <ArrowDownLeft aria-hidden="true" className="size-4" /> : <ArrowUpRight aria-hidden="true" className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{movement.concept}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{movement.date}</p>
                    </div>
                    <p className={`text-sm font-extrabold ${income ? 'text-emerald-600' : 'text-red-500'}`}>{income ? '+' : '-'}{money(movement.amount)}</p>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* MODAL PARA REGISTRAR GASTO */}
      {isGastoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsGastoOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-6">Nuevo Gasto</h3>

            <div className="space-y-4 mb-6">
              {/* Nuevo Selector de Categoría */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Categoría</label>
                <select 
                  value={gastoForm.categoria}
                  onChange={(e) => setGastoForm({...gastoForm, categoria: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="Combustible">Combustible</option>
                  <option value="Insumos para la envasadora">Insumos para la envasadora</option>
                  <option value="Gastos personales">Gastos personales</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Monto del gasto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={gastoForm.monto}
                    onChange={(e) => setGastoForm({...gastoForm, monto: e.target.value})}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none font-bold"
                  />
                </div>
              </div>

              {/* Nuevo Campo de Comentario */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Comentario (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Compra de tapas y etiquetas..."
                  value={gastoForm.comentario}
                  onChange={(e) => setGastoForm({...gastoForm, comentario: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleRegistrarGasto}
              disabled={isSubmitting || !gastoForm.categoria || !gastoForm.monto}
              className="w-full py-3.5 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 hover:bg-sky-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar Gasto'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}