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
import { money, type Cliente } from '@/lib/clientes'
import { parseFecha } from '@/lib/fechas'

interface Gasto {
  id: number;
  categoria?: string;
  descripcion?: string;
  monto: string;
  fecha?: string;
}

interface EntregaResumen {
  id: number;
  fecha?: string;
  monto_pagado: string;
  cliente_nombre?: string;
}

interface Pago {
  id: number;
  fecha?: string;
  fecha_pago?: string;
  monto: string;
  cliente_nombre?: string;
}

// Los movimientos sin fecha se muestran primero como "Reciente"
const timestampDe = (fecha?: string) => (fecha ? parseFecha(fecha).getTime() : Infinity)

export default function Page() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [entregas, setEntregas] = useState<EntregaResumen[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)

  // Estados para el Modal de Gastos actualizados
  const [isGastoOpen, setIsGastoOpen] = useState(false)
  const [gastoForm, setGastoForm] = useState({ categoria: '', monto: '', comentario: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cargarDatos = useCallback(() => {
    Promise.all([
      apiGet<Cliente[]>('/clientes'),
      apiGet<Gasto[]>('/gastos'),
      apiGet<EntregaResumen[]>('/entregas'),
      apiGet<Pago[]>('/pagos')
    ]).then(([clientesData, gastosData, entregasData, pagosData]) => {
      setClientes(clientesData)
      setGastos(gastosData)
      setEntregas(entregasData)
      setPagos(pagosData)
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

  // --- CÁLCULOS MATEMÁTICOS DEL MES ---
  const hoy = new Date()
  const currentMonth = hoy.getMonth()
  const currentYear = hoy.getFullYear()

  const isCurrentMonth = (dateString?: string) => {
    if (!dateString) return true;
    const d = parseFecha(dateString)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }

  const clientesActivos = clientes.length
  const dineroEnLaCalle = clientes.reduce((acc, c) => acc + Number(c.deuda_actual || 0), 0)
  const clientesConDeuda = clientes.filter(c => Number(c.deuda_actual) > 0).length

  const gastosDelMes = gastos
    .filter(g => isCurrentMonth(g.fecha))
    .reduce((acc, g) => acc + Number(g.monto || 0), 0)

  const ingresosDelMes = 
    entregas.filter(e => isCurrentMonth(e.fecha)).reduce((acc, e) => acc + Number(e.monto_pagado || 0), 0) +
    pagos.filter(p => isCurrentMonth(p.fecha || p.fecha_pago)).reduce((acc, p) => acc + Number(p.monto || 0), 0)

  // --- LÓGICA DEL GRÁFICO (Últimos 6 meses) ---
  const chartData = (() => {
    const months: Record<string, { month: string; income: number }> = {};
    for (let i = 5; i >= 0; i--) {
      // Se usa el día 1 para que restar meses no se desborde (ej. 31 de marzo - 1 mes = 3 de marzo)
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const name = d.toLocaleDateString('es-AR', { month: 'short' });
      months[key] = { month: name.charAt(0).toUpperCase() + name.slice(1), income: 0 };
    }

    const addIncome = (fecha: string | undefined, monto: string) => {
      if (!fecha) return;
      const d = parseFecha(fecha);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (months[key]) {
        months[key].income += Number(monto || 0);
      }
    };

    entregas.forEach(e => addIncome(e.fecha, e.monto_pagado));
    // Antes los pagos solo se sumaban si tenían 'fecha'; ahora también se usa 'fecha_pago' como en el resto de la pantalla
    pagos.forEach(p => addIncome(p.fecha || p.fecha_pago, p.monto));
    return Object.values(months);
  })();

  // --- LÓGICA DE MOVIMIENTOS RECIENTES ---
  const formatDate = (fechaStr?: string) => {
    if (!fechaStr) return 'Reciente'
    return parseFecha(fechaStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  const movimientos = [
    ...gastos.map(g => ({ 
      id: `g-${g.id}`, 
      date: formatDate(g.fecha), 
      // Se actualiza para mostrar la categoría y el comentario si existe
      concept: `Gasto · ${g.categoria || 'Varios'}${g.descripcion ? ` (${g.descripcion})` : ''}`, 
      amount: Number(g.monto), 
      type: 'expense', 
      timestamp: timestampDe(g.fecha)
    })),
    ...entregas.filter(e => Number(e.monto_pagado) > 0).map(e => ({ id: `e-${e.id}`, date: formatDate(e.fecha), concept: `Venta · ${e.cliente_nombre || 'Cliente'}`, amount: Number(e.monto_pagado), type: 'income', timestamp: timestampDe(e.fecha) })),
    ...pagos.map(p => ({ id: `p-${p.id}`, date: formatDate(p.fecha || p.fecha_pago), concept: `Cobro deuda · ${p.cliente_nombre || 'Cliente'}`, amount: Number(p.monto), type: 'income', timestamp: timestampDe(p.fecha || p.fecha_pago) }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)

  const metrics = [
    { label: 'Dinero en la calle', value: money(dineroEnLaCalle), detail: `${clientesConDeuda} cuentas pendientes`, icon: Wallet, tone: 'border-orange-100 bg-orange-50 text-orange-600', valueTone: 'text-orange-600' },
    { label: 'Ingresos del mes', value: money(ingresosDelMes), detail: 'Suma de ventas y abonos', icon: ArrowDownLeft, tone: 'border-emerald-100 bg-emerald-50 text-emerald-600', valueTone: 'text-emerald-600' },
    { label: 'Gastos del mes', value: money(gastosDelMes), detail: 'Operativos e insumos', icon: Fuel, tone: 'border-slate-200 bg-slate-50 text-slate-600', valueTone: 'text-slate-900' },
    { label: 'Clientes activos', value: clientesActivos.toString(), detail: 'En tu base de datos', icon: Users, tone: 'border-sky-100 bg-sky-50 text-sky-600', valueTone: 'text-slate-900' },
  ]

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 bg-[#f7faff]">Calculando finanzas...</div>
  }

  if (errorCarga) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 bg-[#f7faff]">No se pudieron cargar las finanzas.</div>
  }

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