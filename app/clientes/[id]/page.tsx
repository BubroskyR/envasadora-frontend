'use client'

import { useCallback, useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  Droplets,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  ShoppingBag,
  X,
  Trash2
} from 'lucide-react'
import { apiGet, apiSend } from '@/lib/api'
import { useAjustes } from '@/lib/ajustes'
import { money, type Cliente } from '@/lib/clientes'
import { parseFecha } from '@/lib/fechas'

interface Entrega {
  id: number;
  fecha: string;
  cantidad_bidones: number;
  monto_total: string;
  monto_pagado: string;
  monto_adeudado: string;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { barrios: barriosConfigurados } = useAjustes();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  
  const [isPagarOpen, setIsPagarOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number | ''>('');
  const [isSubmittingPago, setIsSubmittingPago] = useState(false);
  
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('todos');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [editForm, setEditForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    consumo_semanal_estimado: 1,
    barrio: '',
    latitud: '',
    longitud: ''
  });

  const cargarDatos = useCallback(() => {
    apiGet<Cliente>(`/clientes/${id}`)
      .then(data => {
        setCliente(data);
        setErrorCarga(false);
        const deuda = Number(data.deuda_actual);
        setMontoPago(deuda > 0 ? deuda : '');
        
        setEditForm({
          nombre: data.nombre,
          direccion: data.direccion,
          telefono: data.telefono || '',
          consumo_semanal_estimado: data.consumo_semanal_estimado,
          barrio: data.barrio || '',
          latitud: data.latitud || '',
          longitud: data.longitud || ''
        });
      })
      .catch(err => {
        console.error("Error al cargar cliente:", err);
        setErrorCarga(true);
      });

    apiGet<Entrega[]>(`/clientes/${id}/entregas`)
      .then(data => setEntregas(data))
      .catch(err => console.error("Error al cargar historial:", err));
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleRegistrarPago = async () => {
    if (montoPago === '' || montoPago <= 0) return;
    
    setIsSubmittingPago(true);
    try {
      const response = await apiSend('/pagos', 'POST', {
        cliente_id: cliente?.id,
        monto_pago: Number(montoPago),
        metodo_pago: 'Efectivo'
      });

      if (response.ok) {
        setIsPagarOpen(false);
        cargarDatos();
      } else {
        alert("Error al procesar el pago");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setIsSubmittingPago(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editForm.nombre.trim()) { alert("El nombre es obligatorio"); return; }

    setIsSubmittingEdit(true);
    try {
      const response = await apiSend(`/clientes/${id}`, 'PUT', editForm);

      if (response.ok) {
        setIsEditOpen(false);
        cargarDatos();
      } else {
        alert("Error al actualizar el perfil");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // NUEVA FUNCIÓN PARA ELIMINAR CLIENTE
  const handleEliminarCliente = async () => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${cliente?.nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiSend(`/clientes/${id}`, 'DELETE');

      if (response.ok) {
        // Navegación del lado del cliente, sin recargar toda la app
        router.replace('/');
        return;
      }
      alert("Error al eliminar el cliente");
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
    setIsDeleting(false);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta la geolocalización.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditForm(prev => ({
          ...prev,
          latitud: position.coords.latitude.toString(),
          longitud: position.coords.longitude.toString()
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        alert('No se pudo obtener la ubicación. Revisa los permisos del celular.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (!cliente) {
    return (
      <div className="p-8 text-center text-slate-500">
        {errorCarga ? 'No se pudo cargar el perfil del cliente.' : 'Cargando perfil...'}
      </div>
    );
  }

  const deudaNumerica = Number(cliente.deuda_actual);
  const tieneDeuda = deudaNumerica > 0;

  const mesesDisponibles = Array.from(new Set(entregas.map(e => e.fecha.substring(0, 7))));
  const entregasMostradas = mesSeleccionado === 'todos' 
    ? entregas 
    : entregas.filter(e => e.fecha.substring(0, 7) === mesSeleccionado);

  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900 pb-10">
      <header className="border-b border-slate-200/70 bg-white sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <button
            aria-label="Volver atrás"
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <h1 className="text-base font-extrabold tracking-tight text-slate-900">Perfil del Cliente</h1>
          <button 
            onClick={() => setIsEditOpen(true)}
            aria-label="Editar perfil" 
            className="flex size-10 items-center justify-center rounded-full text-sky-600 bg-sky-50 transition hover:bg-sky-100 hover:text-sky-700"
          >
            <Pencil aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-6 sm:px-8 sm:pt-8">
        
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Droplets aria-hidden="true" className="size-7 fill-current" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Cliente # {cliente.id}</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">{cliente.nombre}</h2>
              <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-5 text-slate-500">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>{cliente.direccion} {cliente.barrio && `- ${cliente.barrio}`}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Phone aria-hidden="true" className="size-4" /></span>
              <div><p className="text-xs text-slate-500">Teléfono</p><p className="mt-0.5 text-sm font-bold text-slate-800">{cliente.telefono || 'No registrado'}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><ShoppingBag aria-hidden="true" className="size-4" /></span>
              <div><p className="text-xs text-slate-500">Consumo semanal</p><p className="mt-0.5 text-sm font-bold text-slate-800">{cliente.consumo_semanal_estimado} bidones</p></div>
            </div>
          </div>
        </section>

        <section className={`mt-5 rounded-3xl border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6 ${tieneDeuda ? 'border-red-100 bg-white' : 'border-emerald-100 bg-emerald-50/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Receipt aria-hidden="true" className={`size-5 ${tieneDeuda ? 'text-red-500' : 'text-emerald-500'}`} />
              <h2 className="text-sm font-bold text-slate-700">Estado de cuenta</h2>
            </div>
            {tieneDeuda ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Con Deuda</span>
            ) : (
               <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Al Día</span>
            )}
          </div>
          
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Saldo actual</p>
              <p className={`mt-1 text-3xl font-extrabold tracking-tight ${tieneDeuda ? 'text-red-600' : 'text-emerald-600'}`}>
                {money(deudaNumerica)}
              </p>
            </div>
            {tieneDeuda && <p className="max-w-[145px] text-right text-xs leading-5 text-slate-500">Saldar en próxima visita</p>}
          </div>

          {tieneDeuda && !isPagarOpen && (
            <button 
              onClick={() => setIsPagarOpen(true)}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 active:scale-95"
            >
              <Banknote aria-hidden="true" className="size-5" />
              Registrar Pago
            </button>
          )}

          {isPagarOpen && (
            <div className="mt-5 pt-4 border-t border-red-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-slate-700">¿Cuánto te pagó?</span>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={montoPago}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMontoPago(val === '' ? '' : Number(val));
                    }}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsPagarOpen(false)}
                  className="flex-1 py-2.5 rounded-lg font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRegistrarPago}
                  disabled={isSubmittingPago || montoPago === '' || montoPago <= 0}
                  className="flex-1 py-2.5 rounded-lg font-bold text-white bg-emerald-500 shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition disabled:opacity-50"
                >
                  {isSubmittingPago ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-7">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Actividad reciente</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Historial de entregas</h2>
            </div>
            
            {entregas.length > 0 && (
              <label className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
                <select
                  value={mesSeleccionado}
                  onChange={(event) => setMesSeleccionado(event.target.value)}
                  className="appearance-none bg-transparent pr-5 outline-none cursor-pointer"
                >
                  <option value="todos">Todos los meses</option>
                  {mesesDisponibles.map(mesIso => {
                    const [year, month] = mesIso.split('-');
                    const nombreMes = new Date(Number(year), Number(month) - 1, 15).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                    return (
                      <option key={mesIso} value={mesIso}>
                        {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 size-3.5 text-slate-400" />
              </label>
            )}
          </div>
          
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
              <span>Fecha</span><span>Pedido</span><span className="text-right">Pagó</span>
            </div>
            
            {entregasMostradas.length === 0 ? (
               <div className="p-4 text-center text-sm text-slate-500">
                 {mesSeleccionado === 'todos' ? 'Aún no hay entregas registradas.' : 'No hubo entregas en este mes.'}
               </div>
            ) : (
              entregasMostradas.map((entrega) => {
                const total = Number(entrega.monto_total);
                const pagado = Number(entrega.monto_pagado);
                const deudaGenerada = total - pagado;

                return (
                  <div key={entrega.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-slate-50 last:border-0 px-3 py-2.5 text-xs sm:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                        <Droplets aria-hidden="true" className="size-3.5" />
                      </span>
                      <span className="font-bold text-slate-800">
                        {parseFecha(entrega.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <span className="text-slate-500">{entrega.cantidad_bidones} bidones</span>
                    <div className="flex flex-col text-right">
                      <span className="font-bold text-slate-700">{money(pagado)}</span>
                      {deudaGenerada > 0 && (
                        <span className="text-[10px] font-semibold text-red-500">Debe {money(deudaGenerada)}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div className="border-t border-slate-100 px-3 py-2 text-right text-[11px] font-medium text-slate-400">
              {entregasMostradas.length} {entregasMostradas.length === 1 ? 'movimiento' : 'movimientos'}
            </div>
          </div>
        </section>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-6">Editar Cliente</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nombre</label>
                <input 
                  type="text" 
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Dirección</label>
                <input 
                  type="text" 
                  value={editForm.direccion}
                  onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Barrio</label>
                <select
                  value={editForm.barrio}
                  onChange={(e) => setEditForm({...editForm, barrio: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all font-semibold text-sm cursor-pointer"
                >
                  <option value="">Sin barrio</option>
                  {/* Se incluye el barrio actual aunque ya no esté en Ajustes, para no perderlo al guardar */}
                  {Array.from(new Set([...barriosConfigurados, ...(editForm.barrio ? [editForm.barrio] : [])])).map((barrio) => (
                    <option key={barrio} value={barrio}>{barrio}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Teléfono</label>
                <input 
                  type="text" 
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Consumo Semanal (Bidones)</label>
                <input 
                  type="number" 
                  min="1"
                  value={editForm.consumo_semanal_estimado}
                  onChange={(e) => setEditForm({...editForm, consumo_semanal_estimado: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                />
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
                  <div>
                    <input
                      type="text"
                      value={editForm.latitud}
                      onChange={(e) => setEditForm({...editForm, latitud: e.target.value})}
                      placeholder="Latitud"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={editForm.longitud}
                      onChange={(e) => setEditForm({...editForm, longitud: e.target.value})}
                      placeholder="Longitud"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={handleGuardarEdicion}
                disabled={isSubmittingEdit}
                className="w-full py-3.5 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 hover:bg-sky-700 disabled:opacity-50 transition-all"
              >
                {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>

              {/* BOTÓN DE ELIMINAR CLIENTE */}
              <button 
                onClick={handleEliminarCliente}
                disabled={isDeleting}
                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="size-4" />
                {isDeleting ? 'Eliminando...' : 'Eliminar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}