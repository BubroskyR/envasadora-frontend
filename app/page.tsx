'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Minus,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { CampoNumero } from '@/components/CampoNumero'
import { apiGet, apiSend } from '@/lib/api'
import { useAjustes } from '@/lib/ajustes'
import { bidonesUltimaEntregaPorCliente, calcularEstado, money, type Cliente, type CustomerStatus, type EntregaBasica, type EstadoAgua } from '@/lib/clientes'

const FILTROS = ['Todos', 'Urgentes', 'Con Deuda', 'Al Día'] as const
type Filtro = typeof FILTROS[number]

const FORM_VACIO = { nombre: '', direccion: '', telefono: '', consumo_semanal_estimado: 1 as number | '', barrio: '', latitud: '', longitud: '' }

const statusConfig: Record<CustomerStatus, { icon: typeof Check; tone: string; bar: string; text: string }> = {
  urgent: { icon: AlertTriangle, tone: 'bg-rose-50 text-rose-600', bar: 'bg-rose-500', text: 'text-rose-600' },
  soon: { icon: Clock, tone: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500', text: 'text-amber-600' },
  fresh: { icon: Check, tone: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', text: 'text-emerald-600' },
}

// Texto para comparar en la búsqueda: minúsculas y sin tildes ("Pérez" se encuentra buscando "perez").
// Acepta null porque dirección y barrio pueden no estar cargados.
function normalizar(texto: string | null | undefined) {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Etiqueta corta para la barra: cuántos días de agua le quedan
function diasCorto(estado: EstadoAgua) {
  if (!Number.isFinite(estado.diasRestantes)) return '—'
  if (estado.diasRestantes === 0) return 'hoy'
  return `${estado.diasRestantes}d`
}

function ClienteFila({ cliente, estado, onEntregar }: { cliente: Cliente, estado: EstadoAgua, onEntregar: (cliente: Cliente) => void }) {
  const config = statusConfig[estado.status]
  const StatusIcon = config.icon
  const deuda = Number(cliente.deuda_actual)
  const ubicacion = [cliente.direccion, cliente.barrio].filter(Boolean).join(' · ')

  return (
    <article className="flex min-h-[70px] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.035)] transition hover:border-sky-200">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${config.tone}`} title={estado.statusLabel}>
        <StatusIcon aria-hidden="true" className="size-3.5" />
      </span>

      {/* Tocar la fila abre el perfil del cliente */}
      <Link href={`/clientes/${cliente.id}`} className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[13px] font-bold text-slate-900">{cliente.nombre}</h3>
          {deuda > 0 && <span className="shrink-0 text-[10px] font-bold text-rose-600">Debe {money(deuda)}</span>}
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-medium text-slate-500">
          <MapPin aria-hidden="true" className="size-3 shrink-0 text-slate-400" />
          <span className="truncate">{ubicacion || 'Sin dirección'}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-2" title={estado.restante} aria-label={`${estado.statusLabel}. ${estado.restante}`}>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${config.bar}`} style={{ width: `${Math.max(estado.level, 3)}%` }} />
          </div>
          <span className={`w-8 shrink-0 text-right text-[10px] font-extrabold ${config.text}`}>{diasCorto(estado)}</span>
        </div>
      </Link>

      <div className="hidden text-right sm:block">
        <p className="text-[10px] font-bold text-slate-400">CONSUMO</p>
        <p className="text-xs font-bold text-slate-700">{cliente.consumo_semanal_estimado}/sem</p>
      </div>

      <button
        aria-label={`Registrar entrega para ${cliente.nombre}`}
        onClick={() => onEntregar(cliente)}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition hover:bg-sky-100 active:scale-95"
      >
        <Truck aria-hidden="true" className="size-4" />
      </button>
      <Link href={`/clientes/${cliente.id}`} tabIndex={-1} aria-hidden="true" className="-ml-1 text-slate-300 hover:text-slate-500">
        <ChevronRight className="size-3.5" />
      </Link>
    </article>
  )
}

// Se monta de cero cada vez que se abre (key = id del cliente), así arranca con valores frescos sin useEffect
function EntregaSheet({ cliente, precioBidon, onClose, onGuardado }: { cliente: Cliente, precioBidon: number, onClose: () => void, onGuardado: () => void }) {
  const deuda = Number(cliente.deuda_actual)
  // '' = campo vacío mientras el usuario escribe un número nuevo
  const [cantidad, setCantidad] = useState<number | ''>(Math.max(1, cliente.consumo_semanal_estimado))
  const [montoPagado, setMontoPagado] = useState<number | ''>(Math.max(1, cliente.consumo_semanal_estimado) * precioBidon)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cantidadNum = cantidad === '' ? 0 : cantidad
  const pagadoNum = montoPagado === '' ? 0 : montoPagado
  const total = cantidadNum * precioBidon
  const saldoFinal = deuda + total - pagadoNum

  // Al cambiar la cantidad, el monto sigue al total de la venta
  const cambiarCantidad = (nueva: number | '') => {
    const valor = nueva === '' ? '' : Math.max(0, nueva)
    setCantidad(valor)
    setMontoPagado(valor === '' ? '' : valor * precioBidon)
  }

  const handleGuardar = async () => {
    setIsSubmitting(true)
    try {
      const response = await apiSend('/entregas', 'POST', {
        cliente_id: cliente.id,
        cantidad_bidones: cantidadNum,
        monto_total: total,
        monto_pagado: pagadoNum,
      })
      if (response.ok) {
        onGuardado()
        onClose()
      } else {
        alert('Hubo un error al registrar la entrega')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión')
    } finally {
      setIsSubmitting(false)
    }
  }

  // El backend descuenta de la deuda lo que se pague de más, por eso "Saldar deuda" = venta + deuda
  const atajos = [
    { label: 'Total', valor: total },
    ...(deuda > 0 ? [{ label: 'Saldar deuda', valor: total + deuda }] : []),
    { label: 'No pagó', valor: 0 },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entrega-title"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm sm:items-center"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Entrega y cobro</p>
            <h2 id="entrega-title" className="mt-1 truncate text-lg font-extrabold text-slate-900">{cliente.nombre}</h2>
            {deuda > 0 && <p className="text-xs font-semibold text-rose-600">Deuda anterior: {money(deuda)}</p>}
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold text-slate-600">Bidones</p>
          <div className="mt-1 flex items-center gap-2">
            <button aria-label="Uno menos" onClick={() => cambiarCantidad(cantidadNum - 1)} className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95">
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <CampoNumero
              aria-label="Cantidad de bidones"
              value={cantidad}
              onValueChange={cambiarCantidad}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-center text-lg font-extrabold outline-none focus:border-sky-400"
            />
            <button aria-label="Uno más" onClick={() => cambiarCantidad(cantidadNum + 1)} className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95">
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Total de la venta: <span className="font-bold text-slate-700">{money(total)}</span></p>
        </div>

        <div className="mt-4">
          <label htmlFor="monto-pagado" className="text-xs font-bold text-slate-600">Monto pagado</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
            <CampoNumero
              id="monto-pagado"
              value={montoPagado}
              onValueChange={setMontoPagado}
              className="h-11 w-full rounded-xl border border-slate-200 pl-7 pr-3 text-sm font-semibold outline-none focus:border-sky-400"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {atajos.map((atajo) => (
              <button
                key={atajo.label}
                onClick={() => setMontoPagado(atajo.valor)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${montoPagado === atajo.valor ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-500 hover:border-sky-200 hover:text-sky-600'}`}
              >
                {atajo.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
          <span className="font-semibold text-slate-500">Saldo después de la entrega</span>
          <span className={`font-extrabold ${saldoFinal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {saldoFinal > 0 ? `Debe ${money(saldoFinal)}` : saldoFinal < 0 ? `A favor ${money(-saldoFinal)}` : 'Al día'}
          </span>
        </div>

        <button
          onClick={handleGuardar}
          disabled={isSubmitting || cantidadNum <= 0}
          className="mt-5 h-11 w-full rounded-xl bg-sky-600 text-sm font-extrabold text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar movimiento'}
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [entregas, setEntregas] = useState<EntregaBasica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const { precioBidon, barrios: barriosConfigurados } = useAjustes();
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('Todos');
  const [barrioSeleccionado, setBarrioSeleccionado] = useState('Todos');

  const [clienteEntrega, setClienteEntrega] = useState<Cliente | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [addForm, setAddForm] = useState(FORM_VACIO);

  const cargarClientes = useCallback(() => {
    Promise.all([
      apiGet<Cliente[]>('/clientes'),
      // Las entregas solo afinan el nivel de agua: si fallan, se muestra igual la lista con una estimación semanal
      apiGet<EntregaBasica[]>('/entregas/ultimas').catch((error) => {
        console.error("Error al cargar entregas:", error);
        return [];
      }),
    ])
      .then(([datosClientes, datosEntregas]) => {
        setClientes(datosClientes);
        setEntregas(datosEntregas);
        setErrorCarga(false);
      })
      .catch((error) => {
        console.error("Error al cargar clientes:", error);
        setErrorCarga(true);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const abrirNuevoCliente = () => {
    // El barrio por defecto es el primero configurado en Ajustes
    setAddForm({ ...FORM_VACIO, barrio: barriosConfigurados[0] ?? '' });
    setIsAddOpen(true);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta la geolocalización.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddForm(prev => ({ ...prev, latitud: position.coords.latitude.toString(), longitud: position.coords.longitude.toString() }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Error GPS:", error);
        alert('No se pudo obtener la ubicación. Revisa los permisos.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nombre.trim()) { alert("El nombre es obligatorio"); return; }

    setIsSubmittingNew(true);
    try {
      // Si el consumo quedó vacío o en 0, se guarda 1 bidón por semana
      const response = await apiSend('/clientes', 'POST', { ...addForm, consumo_semanal_estimado: addForm.consumo_semanal_estimado || 1 });

      if (response.ok) {
        setIsAddOpen(false);
        cargarClientes();
      } else {
        alert("Error al crear el cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Nivel de agua de cada cliente, calculado una sola vez por carga
  const clientesConEstado = useMemo(() => {
    const bidones = bidonesUltimaEntregaPorCliente(entregas);
    const ahora = new Date();
    return clientes.map(cliente => ({
      cliente,
      estado: calcularEstado(cliente, bidones.get(cliente.id), ahora),
    }));
  }, [clientes, entregas]);

  // Primero se aplican búsqueda y barrio; sobre eso se cuentan los filtros rápidos
  const clientesBase = useMemo(() => {
    const texto = normalizar(busqueda);
    const barrioBuscado = barrioSeleccionado.toLowerCase().trim();

    return clientesConEstado.filter(({ cliente }) => {
      // direccion y barrio pueden venir en null (cliente cargado sin esos datos): normalizar lo tolera
      const matchesSearch = !texto ||
        normalizar(cliente.nombre).includes(texto) ||
        normalizar(cliente.barrio).includes(texto) ||
        normalizar(cliente.direccion).includes(texto);
      const matchesBarrio =
        barrioSeleccionado === 'Todos' ||
        cliente.barrio?.toLowerCase().trim() === barrioBuscado;
      return matchesSearch && matchesBarrio;
    });
  }, [clientesConEstado, busqueda, barrioSeleccionado]);

  const { clientesFiltrados, conteos } = useMemo(() => {
    const cumple = (filtro: Filtro, { cliente, estado }: typeof clientesBase[number]) => {
      const deudaNumerica = Number(cliente.deuda_actual);
      switch (filtro) {
        case 'Urgentes': return estado.status === 'urgent';
        case 'Con Deuda': return deudaNumerica > 0;
        case 'Al Día': return deudaNumerica <= 0;
        default: return true;
      }
    };

    const conteos = Object.fromEntries(
      FILTROS.map(f => [f, clientesBase.filter(c => cumple(f, c)).length])
    ) as Record<Filtro, number>;

    const clientesFiltrados = clientesBase
      .filter(c => cumple(filtroActivo, c))
      // Los que tienen menos agua primero, para saber a quién visitar sin tener que recordarlo
      .sort((a, b) => a.estado.level - b.estado.level || a.estado.diasRestantes - b.estado.diasRestantes);

    return { clientesFiltrados, conteos };
  }, [clientesBase, filtroActivo]);

  const urgentesVisibles = clientesFiltrados.filter(c => c.estado.status === 'urgent').length;

  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7faff]/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 pb-3 pt-4 sm:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">Aguas Mas</p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-950">Mis clientes</h1>
            </div>
            <p className="pb-1 text-xs font-semibold text-slate-500">
              <span className="font-extrabold text-slate-900">{clientesFiltrados.length}</span> clientes
            </p>
          </div>

          {/* BUSCADOR Y SELECTOR DE BARRIO */}
          <div className="mt-3 flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Buscar por nombre, dirección o barrio</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre, dirección o barrio"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              {busqueda && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </label>

            <label className="relative shrink-0">
              <span className="sr-only">Filtrar por barrio</span>
              <select
                value={barrioSeleccionado}
                onChange={(e) => setBarrioSeleccionado(e.target.value)}
                className={`h-10 max-w-[9.5rem] cursor-pointer appearance-none truncate rounded-xl border pl-3 pr-7 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-sky-100 ${
                  barrioSeleccionado === 'Todos' ? 'border-slate-200 bg-white text-slate-600' : 'border-sky-300 bg-sky-50 text-sky-700'
                }`}
              >
                <option value="Todos">Todos los barrios</option>
                {barriosConfigurados.map((barrio) => (
                  <option key={barrio} value={barrio}>{barrio}</option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            </label>
          </div>

          {/* FILTROS RÁPIDOS CON CONTADOR */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
            {FILTROS.map((option) => {
              const activo = filtroActivo === option;
              return (
                <button
                  key={option}
                  onClick={() => setFiltroActivo(option)}
                  aria-pressed={activo}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    activo ? 'bg-sky-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                  }`}
                >
                  {option}
                  {!cargando && (
                    <span className={`rounded-full px-1.5 text-[10px] ${activo ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {conteos[option]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section aria-labelledby="client-list-title" className="mx-auto max-w-2xl px-4 pb-20 pt-5 sm:px-8">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Plan de reparto · ordenado por urgencia</p>
            <h2 id="client-list-title" className="mt-0.5 text-base font-extrabold text-slate-900">Ruta de hoy</h2>
          </div>
          {!cargando && !errorCarga && (
            <span className="text-[11px] font-semibold text-slate-400">
              {urgentesVisibles > 0 && <span className="text-rose-600">{urgentesVisibles} urgentes · </span>}
              {clientesFiltrados.length} paradas
            </span>
          )}
        </div>

        {cargando ? (
          <div className="flex flex-col gap-1.5" aria-label="Cargando clientes">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-[70px] animate-pulse rounded-xl border border-slate-200/80 bg-white" />
            ))}
          </div>
        ) : errorCarga ? (
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">No se pudieron cargar los clientes.</p>
            <button onClick={cargarClientes} className="mt-3 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">
              Reintentar
            </button>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">No se encontraron clientes.</p>
            {(busqueda || filtroActivo !== 'Todos' || barrioSeleccionado !== 'Todos') && (
              <button
                onClick={() => { setBusqueda(''); setFiltroActivo('Todos'); setBarrioSeleccionado('Todos'); }}
                className="mt-2 text-sm font-bold text-sky-600 hover:underline"
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {clientesFiltrados.map(({ cliente, estado }) => (
              <ClienteFila key={cliente.id} cliente={cliente} estado={estado} onEntregar={setClienteEntrega} />
            ))}
          </div>
        )}
      </section>

      <button
        onClick={abrirNuevoCliente}
        aria-label="Agregar nuevo cliente"
        className="fixed bottom-24 right-5 z-30 flex size-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-[0_8px_22px_rgba(2,132,199,0.3)] transition hover:bg-sky-700 active:scale-95 sm:right-[max(1.25rem,calc(50%-21rem))]"
      >
        <Plus aria-hidden="true" className="size-6" />
      </button>

      {clienteEntrega && (
        <EntregaSheet
          key={clienteEntrega.id}
          cliente={clienteEntrega}
          precioBidon={precioBidon}
          onClose={() => setClienteEntrega(null)}
          onGuardado={cargarClientes}
        />
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-6">Nuevo Cliente</h3>

            <form onSubmit={handleCrearCliente} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nombre *</label>
                <input 
                  type="text" 
                  required
                  value={addForm.nombre}
                  onChange={(e) => setAddForm({...addForm, nombre: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Dirección</label>
                <input 
                  type="text" 
                  value={addForm.direccion}
                  onChange={(e) => setAddForm({...addForm, direccion: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              
              {/* SELECTOR DE BARRIO DINÁMICO EN EL FORMULARIO DE NUEVO CLIENTE */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Barrio</label>
                <select
                  value={addForm.barrio}
                  onChange={(e) => setAddForm({...addForm, barrio: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all font-semibold text-sm cursor-pointer"
                >
                  {barriosConfigurados.map((barrio) => (
                    <option key={barrio} value={barrio}>{barrio}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Teléfono</label>
                  <input 
                    type="text" 
                    value={addForm.telefono}
                    onChange={(e) => setAddForm({...addForm, telefono: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bidones/Sem</label>
                  <CampoNumero
                    value={addForm.consumo_semanal_estimado}
                    onValueChange={(valor) => setAddForm({...addForm, consumo_semanal_estimado: valor})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mt-2">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ubicación (GPS)</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-200 disabled:opacity-50"
                  >
                    <MapPin className="size-3.5" />
                    {isLocating ? 'Buscando...' : 'Obtener GPS'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={addForm.latitud}
                    onChange={(e) => setAddForm({...addForm, latitud: e.target.value})}
                    placeholder="Latitud"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-sky-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={addForm.longitud}
                    onChange={(e) => setAddForm({...addForm, longitud: e.target.value})}
                    placeholder="Longitud"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmittingNew}
                className="w-full mt-2 py-3.5 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 hover:bg-sky-700 disabled:opacity-50 transition-all"
              >
                {isSubmittingNew ? 'Guardando...' : 'Crear Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}