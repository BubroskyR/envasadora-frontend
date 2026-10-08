'use client'

import { ArrowUpRight, Banknote, User } from 'lucide-react'
import { Dato, EstadoCarga, Fila, HistorialMeses, ListaVacia, PantallaFinanzas, Seccion, TarjetaMes } from '@/components/finanzas/Historial'
import { money } from '@/lib/clientes'
import { fechaCorta, nombreMes } from '@/lib/fechas'
import { useHistorialMensual } from '@/lib/finanzas'

interface MesDeuda {
  mes: string;
  fiado: string;
  cobrado: string;
  // Lo que debían los clientes que se eliminaron ese mes (deja de contar como dinero en la calle)
  deuda_eliminada: string;
  // Lo que se debía al terminar el mes (en el mes en curso, lo que se debe hoy)
  saldo_cierre: string;
}

interface Deudor {
  id: number;
  nombre: string;
  eliminado: boolean;
  saldo: string;
}

interface MovimientoDeuda {
  // fiado: quedó debiendo en una entrega · cobro: pagó deuda · pago_de_mas: en una entrega pagó más de lo que costaba
  tipo: 'fiado' | 'cobro' | 'pago_de_mas';
  id: number;
  fecha: string;
  monto: string;
  cantidad_bidones: number | null;
  cliente_id: number;
  cliente_nombre: string | null;
  cliente_eliminado: boolean;
}

interface DatosDeuda {
  mes: string;
  meses: MesDeuda[];
  deudores: Deudor[];
  movimientos: MovimientoDeuda[];
}

const describir = (m: MovimientoDeuda) => {
  if (m.tipo === 'cobro') return 'Pago de saldo pendiente'
  if (m.tipo === 'pago_de_mas') return 'Pagó de más al entregar'
  return `Fiado · ${m.cantidad_bidones} ${m.cantidad_bidones === 1 ? 'bidón' : 'bidones'}`
}

const detalleMes = (m: MesDeuda) => {
  const eliminada = Number(m.deuda_eliminada)
  return `Se fió ${money(Number(m.fiado))} · Se cobró ${money(Number(m.cobrado))}` +
    (eliminada !== 0 ? ` · Clientes eliminados ${money(eliminada)}` : '')
}

export default function DeudaPage() {
  const { datos, cargando, error, seleccionarMes } = useHistorialMensual<DatosDeuda>('/finanzas/deuda')

  if (!datos) {
    return <PantallaFinanzas etiqueta="Finanzas" titulo="Dinero en la calle"><EstadoCarga error={error} /></PantallaFinanzas>
  }

  const indice = datos.meses.findIndex(m => m.mes === datos.mes)
  const resumen = datos.meses[indice]
  const anterior = datos.meses[indice + 1]
  const esMesEnCurso = indice === 0
  const saldo = Number(resumen?.saldo_cierre ?? 0)
  const variacion = anterior ? saldo - Number(anterior.saldo_cierre) : null

  return (
    <PantallaFinanzas etiqueta="Finanzas" titulo="Dinero en la calle">
      <TarjetaMes
        titulo={esMesEnCurso ? 'Te deben hoy' : `Te debían al cierre de ${nombreMes(datos.mes)}`}
        valor={money(saldo)}
        valorTono="text-orange-600"
        meses={datos.meses.map(m => m.mes)}
        mes={datos.mes}
        onCambiarMes={seleccionarMes}
        actualizando={cargando}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Dato etiqueta="Se fió en el mes" valor={`+${money(Number(resumen?.fiado ?? 0))}`} tono="text-orange-600" />
          <Dato etiqueta="Se cobró de deudas" valor={`-${money(Number(resumen?.cobrado ?? 0))}`} tono="text-emerald-600" />
          {Number(resumen?.deuda_eliminada ?? 0) !== 0 && (
            <div className="col-span-2">
              <Dato etiqueta="Deuda de clientes eliminados este mes (ya no cuenta)" valor={`-${money(Number(resumen.deuda_eliminada))}`} tono="text-slate-600" />
            </div>
          )}
        </div>
        {variacion !== null && (
          <p className="mt-3 text-xs text-slate-500">
            {variacion === 0
              ? `Igual que al cierre de ${nombreMes(anterior.mes)}.`
              : `${variacion > 0 ? 'Subió' : 'Bajó'} ${money(Math.abs(variacion))} respecto al cierre de ${nombreMes(anterior.mes)}.`}
          </p>
        )}
      </TarjetaMes>

      {error && <p className="text-center text-xs font-semibold text-red-500">No se pudo cargar el mes elegido.</p>}

      <Seccion etiqueta="Cuentas pendientes" titulo={esMesEnCurso ? 'Quiénes deben' : `Quiénes debían al cierre de ${nombreMes(datos.mes)}`}>
        {datos.deudores.length === 0 ? (
          <ListaVacia texto="Nadie debía nada." />
        ) : (
          datos.deudores.map(d => (
            <Fila
              key={d.id}
              icono={User}
              iconoTono="bg-orange-50 text-orange-600"
              titulo={d.nombre + (d.eliminado ? ' (eliminado)' : '')}
              monto={money(Number(d.saldo))}
              montoTono="text-orange-600"
              href={d.eliminado ? undefined : `/clientes/${d.id}`}
            />
          ))
        )}
      </Seccion>

      <Seccion etiqueta="Detalle" titulo={`Movimientos de ${nombreMes(datos.mes)}`}>
        {datos.movimientos.length === 0 ? (
          <ListaVacia texto="No se fió ni se cobraron deudas en este mes." />
        ) : (
          datos.movimientos.map(m => {
            const sube = m.tipo === 'fiado'
            return (
              <Fila
                key={`${m.tipo}-${m.id}`}
                icono={sube ? ArrowUpRight : Banknote}
                iconoTono={sube ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}
                titulo={(m.cliente_nombre ?? 'Cliente') + (m.cliente_eliminado ? ' (eliminado)' : '')}
                subtitulo={`${fechaCorta(m.fecha)} · ${describir(m)}`}
                monto={`${sube ? '+' : '-'}${money(Number(m.monto))}`}
                montoTono={sube ? 'text-orange-600' : 'text-emerald-600'}
                href={m.cliente_eliminado ? undefined : `/clientes/${m.cliente_id}`}
              />
            )
          })
        )}
      </Seccion>

      <HistorialMeses
        filas={datos.meses.map(m => ({
          mes: m.mes,
          valor: Number(m.saldo_cierre),
          detalle: detalleMes(m),
        }))}
        mesSeleccionado={datos.mes}
        onSeleccionar={seleccionarMes}
        formato={(v) => money(v)}
        colorBarra="bg-orange-400"
      />
    </PantallaFinanzas>
  )
}
