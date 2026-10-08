'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import { nombreMes } from '@/lib/fechas'

// Piezas comunes de las pantallas de historial mensual (Dinero en la calle, Ingresos, Gastos y Clientes)

export function PantallaFinanzas({ etiqueta, titulo, children }: { etiqueta: string; titulo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7faff] text-slate-900 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href="/finanzas"
            aria-label="Volver a Finanzas"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">{etiqueta}</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-950">{titulo}</h1>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-5 sm:px-8 sm:pt-6">{children}</div>
    </main>
  )
}

// Mensaje mientras carga por primera vez o si falló
export function EstadoCarga({ error }: { error: boolean }) {
  return (
    <div className="py-16 text-center text-sm text-slate-500">
      {error ? 'No se pudo cargar el historial. Revisá la conexión e intentá de nuevo.' : 'Cargando historial...'}
    </div>
  )
}

export function SelectorMes({ meses, mes, onCambiar }: { meses: string[]; mes: string; onCambiar: (mes: string) => void }) {
  return (
    <label className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
      <span className="sr-only">Mes</span>
      <select
        value={mes}
        onChange={(e) => onCambiar(e.target.value)}
        className="appearance-none bg-transparent pr-5 outline-none cursor-pointer"
      >
        {meses.map(m => <option key={m} value={m}>{nombreMes(m)}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 size-3.5 text-slate-400" />
    </label>
  )
}

// Tarjeta principal con el número grande del mes elegido
export function TarjetaMes({ titulo, valor, valorTono, meses, mes, onCambiarMes, actualizando, children }: {
  titulo: string;
  valor: string;
  valorTono: string;
  meses: string[];
  mes: string;
  onCambiarMes: (mes: string) => void;
  actualizando: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-opacity sm:p-6 ${actualizando ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">{titulo}</p>
        <SelectorMes meses={meses} mes={mes} onCambiar={onCambiarMes} />
      </div>
      <p className={`mt-3 text-4xl font-extrabold tracking-tight ${valorTono}`}>{valor}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}

// Cuadrito con un dato secundario (ej. "Ventas al entregar: $12.000")
export function Dato({ etiqueta, valor, tono = 'text-slate-900' }: { etiqueta: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3.5 py-3">
      <p className="text-[11px] font-semibold leading-4 text-slate-500">{etiqueta}</p>
      <p className={`mt-1 text-base font-extrabold tracking-tight ${tono}`}>{valor}</p>
    </div>
  )
}

export function Seccion({ etiqueta, titulo, children }: { etiqueta?: string; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        {etiqueta && <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">{etiqueta}</p>}
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">{titulo}</h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
        {children}
      </div>
    </section>
  )
}

export function ListaVacia({ texto }: { texto: string }) {
  return <div className="p-5 text-center text-sm text-slate-500">{texto}</div>
}

// Fila de una lista de detalle. Si tiene href, toda la fila lleva a esa pantalla (ej. el perfil del cliente).
export function Fila({ icono: Icono, iconoTono, titulo, subtitulo, monto, montoTono = 'text-slate-800', detalleMonto, href }: {
  icono: LucideIcon;
  iconoTono: string;
  titulo: string;
  subtitulo?: string;
  monto: string;
  montoTono?: string;
  detalleMonto?: string;
  href?: string;
}) {
  const contenido = (
    <>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconoTono}`}>
        <Icono aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{titulo}</p>
        {subtitulo && <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitulo}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-extrabold ${montoTono}`}>{monto}</p>
        {detalleMonto && <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{detalleMonto}</p>}
      </div>
      {href && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-300" />}
    </>
  )
  const clases = 'flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0'
  return href
    ? <Link href={href} className={`${clases} transition hover:bg-slate-50`}>{contenido}</Link>
    : <div className={clases}>{contenido}</div>
}

// Lista de todos los meses con una barra proporcional al valor. Tocar un mes lo muestra arriba.
export function HistorialMeses({ filas, mesSeleccionado, onSeleccionar, formato, colorBarra }: {
  filas: { mes: string; valor: number; detalle?: string }[];
  mesSeleccionado: string;
  onSeleccionar: (mes: string) => void;
  formato: (valor: number) => string;
  colorBarra: string;
}) {
  const maximo = Math.max(...filas.map(f => Math.abs(f.valor)), 0)

  return (
    <Seccion etiqueta="Organización" titulo="Historial por mes">
      {filas.map(({ mes, valor, detalle }, i) => {
        const seleccionado = mes === mesSeleccionado
        return (
          <button
            key={mes}
            onClick={() => {
              onSeleccionar(mes)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-current={seleccionado ? 'true' : undefined}
            className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 ${seleccionado ? 'bg-sky-50/70' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className={`text-sm font-bold ${seleccionado ? 'text-sky-700' : 'text-slate-800'}`}>
                {nombreMes(mes)}
                {i === 0 && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">en curso</span>}
              </p>
              <p className="text-sm font-extrabold text-slate-900">{formato(valor)}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${colorBarra}`} style={{ width: `${maximo > 0 ? (Math.abs(valor) / maximo) * 100 : 0}%` }} />
            </div>
            {detalle && <p className="mt-1.5 text-[11px] text-slate-500">{detalle}</p>}
          </button>
        )
      })}
    </Seccion>
  )
}
