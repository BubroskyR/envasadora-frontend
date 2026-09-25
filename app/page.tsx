'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ChevronRight,
  CircleDollarSign,
  Droplets,
  MapPin,
  Menu,
  Plus,
  Search,
  Truck,
  UserRound,
  X 
} from 'lucide-react'

type CustomerStatus = 'fresh' | 'soon' | 'urgent'

interface Cliente {
  id: number;
  nombre: string;
  direccion: string;
  fecha_ultima_entrega: string | null;
  consumo_semanal_estimado: number;
  deuda_actual: string;
}

const statusStyles = {
  fresh: {
    bar: 'bg-emerald-500',
    track: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    label: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  soon: {
    bar: 'bg-amber-400',
    track: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    label: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  urgent: {
    bar: 'bg-red-500',
    track: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    label: 'text-red-700',
    dot: 'bg-red-500',
  },
}

// 1. AHORA LA TARJETA RECIBE EL PRECIO COMO PROPIEDAD
function CustomerCard({ customer, onUpdate, precioBidon }: { customer: Cliente, onUpdate: () => void, precioBidon: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cantidadBidones, setCantidadBidones] = useState(customer.consumo_semanal_estimado);
  
  // El monto pagado inicia calculándose con el precio variable
  const [montoPagado, setMontoPagado] = useState(customer.consumo_semanal_estimado * precioBidon);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actualiza el monto inicial si cambia el precio desde afuera mientras el modal está cerrado
  useEffect(() => {
    setMontoPagado(cantidadBidones * precioBidon);
  }, [precioBidon, cantidadBidones]);

  const calcularEstado = (fechaUltimaEntrega: string | null, consumoEstimado: number) => {
    if (!fechaUltimaEntrega) return { level: 0, status: 'urgent' as CustomerStatus, statusLabel: 'Nunca entregado', detail: 'Falta entrega' };
    
    const fechaEntrega = new Date(fechaUltimaEntrega);
    const fechaActual = new Date();
    const diasPasados = Math.floor((fechaActual.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24));
    
    let level = 100 - ((diasPasados / consumoEstimado) * 100);
    if (level < 0) level = 0;
    if (level > 100) level = 100;

    let status: CustomerStatus = 'fresh';
    let statusLabel = 'Nivel óptimo';
    if (level <= 20) { status = 'urgent'; statusLabel = 'Entrega urgente'; }
    else if (level <= 50) { status = 'soon'; statusLabel = 'Próxima entrega'; }

    const detail = diasPasados === 0 ? 'Entregado hoy' : `Hace ${diasPasados} días`;
    return { level, status, statusLabel, detail };
  };

  const estado = calcularEstado(customer.fecha_ultima_entrega, customer.consumo_semanal_estimado);
  const styles = statusStyles[estado.status];
  const deudaNumerica = Number(customer.deuda_actual);

  const handleRegistrarEntrega = async () => {
    setIsSubmitting(true);
    try {
      // 2. EL CALCULO FINAL USA EL PRECIO ELEGIDO EN LA PANTALLA PRINCIPAL
      const montoTotal = cantidadBidones * precioBidon;
      
      const response = await fetch('https://envasadora-mas.onrender.com/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: customer.id,
          cantidad_bidones: cantidadBidones,
          monto_total: montoTotal,
          monto_pagado: montoPagado
        })
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
      <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6 relative z-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
              {estado.status === 'urgent' ? <AlertTriangle aria-hidden="true" /> : <Droplets aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">{customer.nombre}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-slate-500">
                <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span>{customer.direccion}</span>
              </p>
            </div>
          </div>
          <button aria-label={`Más opciones para ${customer.nombre}`} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50/80 p-4">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold">
            <span className={styles.label}>{estado.statusLabel}</span>
            <span className="text-slate-500">{Math.round(estado.level)}% disponible</span>
          </div>
          <div className={`h-3 overflow-hidden rounded-full ${styles.track}`}>
            <div className={`h-full rounded-full transition-all duration-1000 ${styles.bar}`} style={{ width: `${estado.level}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{estado.detail}</span>
            <span>Consumo est.: {customer.consumo_semanal_estimado} días</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <CircleDollarSign aria-hidden="true" className={deudaNumerica > 0 ? 'size-4 text-red-500' : 'size-4 text-slate-400'} />
            <span className="text-slate-500">Deuda:</span>
            <span className={`font-bold ${deudaNumerica > 0 ? 'text-red-600' : 'text-slate-600'}`}>
              ${deudaNumerica.toLocaleString('es-AR')}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Última visita: {customer.fecha_ultima_entrega ? new Date(customer.fecha_ultima_entrega).toLocaleDateString('es-AR') : 'Nunca'}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 text-white font-semibold shadow-sm shadow-sky-600/20 hover:bg-sky-700 transition-colors"
          >
            <Truck className="size-5" />
            Entregar agua / cobrar
          </button>
          <Link 
            href={`/clientes/${customer.id}`}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Ver perfil
            <ArrowRight className="size-5" />
          </Link>
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
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">El total de la venta es ${cantidadBidones * precioBidon}</p>
              </div>
            </div>

            <button 
              onClick={handleRegistrarEntrega}
              disabled={isSubmitting}
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
  
  // 3. AQUÍ CREAMOS EL CONTROLADOR MAESTRO DEL PRECIO (inicia en 2000 por defecto)
  const [precioBidon, setPrecioBidon] = useState(2000);

  useEffect(() => {
    fetch("https://envasadora-mas.onrender.com/api/clientes")
      .then((respuesta) => respuesta.json())
      .then((datos) => setClientes(datos))
      .catch((error) => console.error("Error al cargar clientes:", error));
  }, []);

  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900 pb-20">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <Droplets aria-hidden="true" className="size-5 fill-current" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">Ruta del día</p>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Aguas Mas</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Notificaciones" className="rounded-full p-2.5 text-slate-500 hover:bg-slate-100"><Bell aria-hidden="true" className="size-5" /></button>
            <div className="ml-1 hidden size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 sm:flex"><UserRound aria-hidden="true" className="size-4" /></div>
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
            <p className="mt-2 text-sm text-slate-500">{clientes.length} paradas en tu ruta.</p>
          </div>
          
          {/* 4. EL INPUT DONDE EL REPARTIDOR PUEDE CAMBIAR EL PRECIO DEL DÍA */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-semibold text-slate-600">Precio Bidón: $</span>
              <input 
                type="number" 
                value={precioBidon}
                onChange={(e) => setPrecioBidon(Number(e.target.value))}
                className="w-20 text-base font-bold text-sky-600 outline-none bg-transparent"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 mt-8">
          {clientes.map((cliente) => (
            <CustomerCard 
              customer={cliente} 
              key={cliente.id} 
              precioBidon={precioBidon} /* Le pasamos el precio actual a cada tarjeta */
              onUpdate={() => {
                fetch("https://envasadora-mas.onrender.com/api/clientes")
                  .then((res) => res.json())
                  .then(setClientes);
              }} 
            />
          ))}
        </div>
      </div>
    </main>
  )
}