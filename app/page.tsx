'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  CircleDollarSign,
  Droplets,
  MapPin,
  Plus,
  Search,
  Truck,
  X,
  Filter
} from 'lucide-react'
import { apiGet, apiSend } from '@/lib/api'
import { useAjustes } from '@/lib/ajustes'
import { bidonesUltimaEntregaPorCliente, calcularEstado, money, type Cliente, type EntregaBasica, type EstadoAgua } from '@/lib/clientes'
import { parseFecha } from '@/lib/fechas'

const FILTROS = ['Todos', 'Urgentes', 'Con Deuda', 'Al Día'] as const
type Filtro = typeof FILTROS[number]

const FORM_VACIO = { nombre: '', direccion: '', telefono: '', consumo_semanal_estimado: 1, barrio: '', latitud: '', longitud: '' }

const statusStyles = {
  fresh: {
    bar: 'bg-emerald-500', track: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', label: 'text-emerald-700', dot: 'bg-emerald-500',
  },
  soon: {
    bar: 'bg-amber-400', track: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', label: 'text-amber-700', dot: 'bg-amber-400',
  },
  urgent: {
    bar: 'bg-red-500', track: 'bg-red-50', icon: 'bg-red-100 text-red-600', label: 'text-red-700', dot: 'bg-red-500',
  },
}

function CustomerCard({ customer, estado, onUpdate, precioBidon }: { customer: Cliente, estado: EstadoAgua, onUpdate: () => void, precioBidon: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cantidadBidones, setCantidadBidones] = useState(customer.consumo_semanal_estimado);
  const [montoPagado, setMontoPagado] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cada vez que se abre el modal se parte de valores frescos (consumo estimado y precio actual),
  // en vez de arrastrar lo que se cargó en la entrega anterior.
  const abrirModal = () => {
    setCantidadBidones(customer.consumo_semanal_estimado);
    setMontoPagado(customer.consumo_semanal_estimado * precioBidon);
    setIsModalOpen(true);
  };

  const styles = statusStyles[estado.status];
  const deudaNumerica = Number(customer.deuda_actual);

  const handleRegistrarEntrega = async () => {
    setIsSubmitting(true);
    try {
      const montoTotal = cantidadBidones * precioBidon;
      
      const response = await apiSend('/entregas', 'POST', {
        cliente_id: customer.id,
        cantidad_bidones: cantidadBidones,
        monto_total: montoTotal,
        monto_pagado: montoPagado
      });

      if (response.ok) {
        setIsModalOpen(false);
        onUpdate();
      } else {
        alert("Hubo un error al registrar la entrega");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6 relative z-0 hover:border-sky-200 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
              {estado.status === 'urgent' ? <AlertTriangle aria-hidden="true" /> : <Droplets aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">{customer.nombre}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-slate-500">
                <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span className="truncate">{customer.direccion} {customer.barrio && `- ${customer.barrio}`}</span>
              </p>
            </div>
          </div>
          <Link href={`/clientes/${customer.id}`} aria-label={`Más opciones para ${customer.nombre}`} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <ChevronRight aria-hidden="true" className="size-5" />
          </Link>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50/80 p-4">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold">
            <span className={styles.label}>{estado.statusLabel}</span>
            <span className="text-slate-500">{Math.round(estado.level)}% · consume {customer.consumo_semanal_estimado}/sem</span>
          </div>
          <div className={`h-3 overflow-hidden rounded-full ${styles.track}`}>
            <div className={`h-full rounded-full transition-all duration-1000 ${styles.bar}`} style={{ width: `${estado.level}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{estado.detail}</span>
            <span className={`font-semibold ${styles.label}`}>{estado.restante}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <CircleDollarSign aria-hidden="true" className={deudaNumerica > 0 ? 'size-4 text-red-500' : 'size-4 text-slate-400'} />
            <span className="text-slate-500">Deuda:</span>
            <span className={`font-bold ${deudaNumerica > 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {money(deudaNumerica)}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Última: {customer.fecha_ultima_entrega ? parseFecha(customer.fecha_ultima_entrega).toLocaleDateString('es-AR') : 'Nunca'}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button 
            onClick={abrirModal}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 text-white font-semibold shadow-sm shadow-sky-600/20 hover:bg-sky-700 transition-colors"
          >
            <Truck className="size-5" />
            Entregar agua / cobrar
          </button>
        </div>
      </article>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-1">Registrar Entrega</h3>
            <p className="text-sm text-slate-500 mb-6">{customer.nombre}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad de bidones</label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                  <input 
                    type="number" 
                    min="1"
                    value={cantidadBidones}
                    onChange={(e) => {
                      const nuevaCantidad = Number(e.target.value);
                      setCantidadBidones(nuevaCantidad);
                      setMontoPagado(nuevaCantidad * precioBidon);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Monto que te pagó ahora</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    min="0"
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Total de la venta: {money(cantidadBidones * precioBidon)}</p>
              </div>
            </div>

            <button 
              onClick={handleRegistrarEntrega}
              disabled={isSubmitting || cantidadBidones <= 0 || montoPagado < 0}
              className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar Entrega'}
            </button>
          </div>
        </div>
      )}
    </>
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
      const response = await apiSend('/clientes', 'POST', addForm);

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

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const barrioBuscado = barrioSeleccionado.toLowerCase().trim();

    return clientesConEstado
      .filter(({ cliente, estado }) => {
        const matchesSearch = !texto ||
          cliente.nombre.toLowerCase().includes(texto) ||
          (cliente.barrio?.toLowerCase().includes(texto) ?? false) ||
          cliente.direccion.toLowerCase().includes(texto);
        if (!matchesSearch) return false;

        const matchesBarrio =
          barrioSeleccionado === 'Todos' ||
          cliente.barrio?.toLowerCase().trim() === barrioBuscado;
        if (!matchesBarrio) return false;

        const deudaNumerica = Number(cliente.deuda_actual);
        switch (filtroActivo) {
          case 'Urgentes':
            return estado.status === 'urgent';
          case 'Con Deuda':
            return deudaNumerica > 0;
          case 'Al Día':
            return deudaNumerica <= 0;
          default:
            return true;
        }
      })
      // Los que tienen menos agua primero, para saber a quién visitar sin tener que recordarlo
      .sort((a, b) => a.estado.level - b.estado.level || a.estado.diasRestantes - b.estado.diasRestantes);
  }, [clientesConEstado, busqueda, filtroActivo, barrioSeleccionado]);

  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900 pb-20 relative">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col px-5 py-4 sm:px-8 sm:py-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
                <Droplets aria-hidden="true" className="size-5 fill-current" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">Ruta del día</p>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Aguas Mas</h1>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {clientesFiltrados.length} clientes
            </span>
          </div>

          {/* BUSCADOR Y SELECTOR DE BARRIO */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o barrio..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="relative shrink-0">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Filter className="size-3.5" />
              </div>
              <select
                value={barrioSeleccionado}
                onChange={(e) => setBarrioSeleccionado(e.target.value)}
                className="h-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer appearance-none"
              >
                <option value="Todos">Todos los barrios</option>
                {barriosConfigurados.map((barrio) => (
                  <option key={barrio} value={barrio}>{barrio}</option>
                ))}
              </select>
            </div>
          </div>

          {/* FILTROS RÁPIDOS */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {FILTROS.map((option) => (
              <button 
                key={option} 
                onClick={() => setFiltroActivo(option)} 
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  filtroActivo === option ? 'bg-sky-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:text-sky-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-7 sm:px-8 sm:pt-10">
        <section className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Mis clientes</h2>
            <p className="mt-2 text-sm text-slate-500">{clientesFiltrados.length} clientes encontrados.</p>
          </div>
        </section>

        {cargando ? (
          <p className="text-center text-slate-500 mt-10">Cargando clientes...</p>
        ) : errorCarga ? (
          <div className="text-center mt-10">
            <p className="text-slate-500">No se pudieron cargar los clientes.</p>
            <button onClick={cargarClientes} className="mt-3 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">
              Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-8">
            {clientesFiltrados.length === 0 ? (
              <p className="text-center text-slate-500 mt-10">No se encontraron clientes.</p>
            ) : (
              clientesFiltrados.map(({ cliente, estado }) => (
                <CustomerCard 
                  customer={cliente} 
                  estado={estado}
                  key={cliente.id} 
                  precioBidon={precioBidon}
                  onUpdate={cargarClientes} 
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-24 right-5 sm:right-auto sm:left-1/2 sm:ml-[300px] z-30">
        <button 
          onClick={abrirNuevoCliente}
          className="flex size-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-600/30 transition-transform hover:scale-105 active:scale-95"
          aria-label="Agregar nuevo cliente"
        >
          <Plus className="size-7" />
        </button>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
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
                  <input 
                    type="number" 
                    min="1"
                    value={addForm.consumo_semanal_estimado}
                    onChange={(e) => setAddForm({...addForm, consumo_semanal_estimado: Number(e.target.value)})}
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