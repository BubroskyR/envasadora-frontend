'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, MessageCircle, RotateCcw, Send } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useAjustes } from '@/lib/ajustes'
import type { Cliente } from '@/lib/clientes'
import { armarMensaje, formatearNumero, linkWhatsApp, numeroWhatsApp } from '@/lib/whatsapp'
import {
  MENSAJE_DEFAULT,
  desmarcarEnviado,
  guardarMensajeAviso,
  limpiarAvisosViejos,
  marcarEnviado,
  reiniciarEnviados,
  useEnviadosHoy,
  useMensajeAviso,
} from '@/lib/avisos'

// Avisar por WhatsApp a los clientes del barrio que se va a visitar.
// Para cada cliente se abre WhatsApp con su chat y el mensaje ya escrito: se toca "Enviar" y se vuelve a la app.
// El barrio va en la dirección (/avisar?barrio=Centro), así al volver de WhatsApp sigue elegido.

const mismoBarrio = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').toLowerCase().trim() === (b ?? '').toLowerCase().trim()

const horaCorta = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

// useSearchParams necesita un Suspense alrededor para que la página se pueda generar al compilar
export default function AvisarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
      <AvisarContenido />
    </Suspense>
  )
}

function AvisarContenido() {
  const router = useRouter()
  const barrio = useSearchParams().get('barrio') ?? ''
  const { barrios: barriosAjustes, codigoArea } = useAjustes()
  const mensaje = useMensajeAviso()
  const enviados = useEnviadosHoy(barrio)

  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)

  useEffect(() => {
    limpiarAvisosViejos()
    apiGet<Cliente[]>('/clientes')
      .then(setClientes)
      .catch(err => {
        console.error('Error al cargar clientes:', err)
        setErrorCarga(true)
      })
  }, [])

  // Barrios de Ajustes + los que tengan cargados los clientes (+ el de la dirección, por si no está en ninguno),
  // con cuántos clientes hay en cada uno
  const opciones = useMemo(() => {
    const nombres = [...barriosAjustes]
    for (const nombre of [...(clientes ?? []).map(c => c.barrio), barrio]) {
      if (nombre?.trim() && !nombres.some(n => mismoBarrio(n, nombre))) nombres.push(nombre.trim())
    }
    return nombres.map(nombre => ({ nombre, cantidad: (clientes ?? []).filter(c => mismoBarrio(c.barrio, nombre)).length }))
  }, [barriosAjustes, clientes, barrio])
  const barrioElegido = opciones.find(o => mismoBarrio(o.nombre, barrio))?.nombre ?? ''

  const destinatarios = useMemo(() => (clientes ?? [])
    .filter(c => barrio && mismoBarrio(c.barrio, barrio))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(cliente => {
      const numero = numeroWhatsApp(cliente.telefono, codigoArea)
      const texto = armarMensaje(mensaje, { nombre: cliente.nombre, barrio })
      return { cliente, numero, link: numero ? linkWhatsApp(numero, texto) : null }
    }), [clientes, barrio, codigoArea, mensaje])

  const conWhatsApp = destinatarios.filter(d => d.link)
  const avisados = conWhatsApp.filter(d => enviados[d.cliente.id]).length
  const proximo = conWhatsApp.find(d => !enviados[d.cliente.id])
  const sinNumero = destinatarios.length - conWhatsApp.length

  const cambiarBarrio = (nuevo: string) => {
    router.replace(nuevo ? `/avisar?barrio=${encodeURIComponent(nuevo)}` : '/avisar', { scroll: false })
  }

  const volver = () => {
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  // La vista previa usa el primer cliente al que realmente se le va a enviar
  const ejemplo = (conWhatsApp[0] ?? destinatarios[0])?.cliente.nombre ?? 'Juan'

  return (
    <main className="min-h-screen bg-[#f7faff] pb-40 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4 sm:px-8">
          <button
            onClick={volver}
            aria-label="Volver"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1da851]">WhatsApp</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-950">Avisar a un barrio</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-5 sm:px-8">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
          <label htmlFor="barrio" className="block text-xs font-bold uppercase tracking-wider text-slate-500">¿A qué barrio vas?</label>
          <div className="relative mt-1.5">
            <select
              id="barrio"
              value={barrioElegido}
              onChange={(e) => cambiarBarrio(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-bold text-slate-800 outline-none focus:border-[#25D366] focus:bg-white focus:ring-2 focus:ring-[#25D366]/20"
            >
              <option value="">Elegí un barrio</option>
              {opciones.map(o => (
                <option key={o.nombre} value={o.nombre}>
                  {o.nombre}{clientes ? ` (${o.cantidad} ${o.cantidad === 1 ? 'cliente' : 'clientes'})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <label htmlFor="mensaje" className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mensaje</label>
            {mensaje !== MENSAJE_DEFAULT && (
              <button onClick={() => guardarMensajeAviso(MENSAJE_DEFAULT)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                Volver al mensaje original
              </button>
            )}
          </div>
          <textarea
            id="mensaje"
            value={mensaje}
            onChange={(e) => guardarMensajeAviso(e.target.value)}
            rows={4}
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-[#25D366] focus:bg-white focus:ring-2 focus:ring-[#25D366]/20"
          />
          <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
            <span className="font-bold text-slate-600">{'{nombre}'}</span> y <span className="font-bold text-slate-600">{'{barrio}'}</span> se reemplazan por los datos de cada cliente. El texto queda guardado para la próxima vez.
          </p>

          {/* Vista previa con el estilo de un mensaje de WhatsApp */}
          <div className="mt-4 rounded-2xl bg-[#efeae2] p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Así le llega a {ejemplo}</p>
            <div className="ml-auto w-fit max-w-[92%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] leading-5 text-slate-800 shadow-sm">
              {armarMensaje(mensaje, { nombre: ejemplo, barrio: barrio || 'tu barrio' }) || ' '}
            </div>
          </div>
        </section>

        {errorCarga ? (
          <p className="py-6 text-center text-sm text-slate-500">No se pudieron cargar los clientes. Revisá la conexión.</p>
        ) : !clientes ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando clientes...</p>
        ) : !barrio ? (
          <p className="py-6 text-center text-sm text-slate-500">Elegí un barrio para ver a quién avisar.</p>
        ) : destinatarios.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No hay clientes cargados en {barrio}.</p>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-700">
                  <span className="text-xl font-extrabold text-slate-950">{avisados}</span> de {conWhatsApp.length} avisados hoy
                </p>
                {avisados > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Marcar de nuevo como pendientes a los clientes de ${barrio}?`)) reiniciarEnviados(barrio)
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" /> Empezar de nuevo
                  </button>
                )}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#25D366] transition-all"
                  style={{ width: `${conWhatsApp.length ? (avisados / conWhatsApp.length) * 100 : 0}%` }}
                />
              </div>
              {sinNumero > 0 && (
                <p className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold leading-4 text-amber-700">
                  <AlertTriangle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                  {sinNumero} {sinNumero === 1 ? 'cliente no tiene' : 'clientes no tienen'} un teléfono válido. Tocá &quot;Corregir&quot; para cargarlo.
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {destinatarios.map(({ cliente, numero, link }) => {
                const enviadoA = enviados[cliente.id]
                return (
                  <div key={cliente.id} className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 ${enviadoA ? 'bg-emerald-50/40' : ''}`}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      !link ? 'bg-amber-50 text-amber-600' : enviadoA ? 'bg-[#25D366] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {!link ? <AlertTriangle aria-hidden="true" className="size-4" /> : enviadoA ? <Check aria-hidden="true" className="size-4" /> : cliente.nombre.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{cliente.nombre}</p>
                      <p className={`mt-0.5 truncate text-[11px] ${numero ? 'text-slate-500' : 'font-semibold text-amber-700'}`}>
                        {numero
                          ? enviadoA ? `${formatearNumero(numero)} · avisado ${horaCorta(enviadoA)}` : formatearNumero(numero)
                          : cliente.telefono ? `Número incompleto: ${cliente.telefono}` : 'Sin teléfono cargado'}
                      </p>
                    </div>

                    {!link ? (
                      <Link href={`/clientes/${cliente.id}`} className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                        Corregir
                      </Link>
                    ) : enviadoA ? (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => marcarEnviado(barrio, cliente.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500"
                        >
                          Reenviar
                        </a>
                        <button onClick={() => desmarcarEnviado(barrio, cliente.id)} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                          No lo envié
                        </button>
                      </div>
                    ) : (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => marcarEnviado(barrio, cliente.id)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#20bd5b] active:scale-95"
                      >
                        <Send aria-hidden="true" className="size-3.5" /> Enviar
                      </a>
                    )}
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>

      {/* Botón fijo para ir cliente por cliente sin buscar en la lista */}
      {barrio && clientes && conWhatsApp.length > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-30 px-4">
          <div className="mx-auto max-w-2xl">
            {proximo ? (
              <a
                href={proximo.link!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => marcarEnviado(barrio, proximo.cliente.id)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(37,211,102,0.35)] transition hover:bg-[#20bd5b] active:scale-[0.98]"
              >
                <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
                <span className="truncate">Enviar a {proximo.cliente.nombre}</span>
                <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[11px]">{avisados + 1}/{conWhatsApp.length}</span>
              </a>
            ) : (
              <div className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                <Check aria-hidden="true" className="size-5" /> ¡Listo! Avisaste a {conWhatsApp.length} {conWhatsApp.length === 1 ? 'cliente' : 'clientes'} de {barrio}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
