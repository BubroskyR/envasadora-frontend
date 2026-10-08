'use client'

import { Banknote, Droplets } from 'lucide-react'
import { Dato, EstadoCarga, Fila, HistorialMeses, ListaVacia, PantallaFinanzas, Seccion, TarjetaMes } from '@/components/finanzas/Historial'
import { money } from '@/lib/clientes'
import { fechaCorta, nombreMes } from '@/lib/fechas'
import { useHistorialMensual } from '@/lib/finanzas'

interface MesIngresos {
  mes: string;
  ventas: string;
  cobros: string;
  total: string;
}

interface MovimientoIngreso {
  tipo: 'venta' | 'cobro';
  id: number;
  fecha: string;
  monto: string;
  cantidad_bidones: number | null;
  cliente_id: number;
  cliente_nombre: string | null;
  cliente_eliminado: boolean;
}

interface DatosIngresos {
  mes: string;
  meses: MesIngresos[];
  movimientos: MovimientoIngreso[];
}

export default function IngresosPage() {
  const { datos, cargando, error, seleccionarMes } = useHistorialMensual<DatosIngresos>('/finanzas/ingresos')

  if (!datos) {
    return <PantallaFinanzas etiqueta="Finanzas" titulo="Ingresos"><EstadoCarga error={error} /></PantallaFinanzas>
  }

  const resumen = datos.meses.find(m => m.mes === datos.mes)
  const ventas = datos.movimientos.filter(m => m.tipo === 'venta')

  return (
    <PantallaFinanzas etiqueta="Finanzas" titulo="Ingresos">
      <TarjetaMes
        titulo={`Ingresos de ${nombreMes(datos.mes)}`}
        valor={money(Number(resumen?.total ?? 0))}
        valorTono="text-emerald-600"
        meses={datos.meses.map(m => m.mes)}
        mes={datos.mes}
        onCambiarMes={seleccionarMes}
        actualizando={cargando}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Dato etiqueta="Ventas (cobrado al entregar)" valor={money(Number(resumen?.ventas ?? 0))} />
          <Dato etiqueta="Cobros de deudas" valor={money(Number(resumen?.cobros ?? 0))} />
          <Dato etiqueta="Entregas cobradas" valor={ventas.length.toString()} />
          <Dato etiqueta="Bidones vendidos" valor={ventas.reduce((acc, m) => acc + (m.cantidad_bidones ?? 0), 0).toString()} />
        </div>
      </TarjetaMes>

      {error && <p className="text-center text-xs font-semibold text-red-500">No se pudo cargar el mes elegido.</p>}

      <Seccion etiqueta="Detalle" titulo={`Movimientos de ${nombreMes(datos.mes)}`}>
        {datos.movimientos.length === 0 ? (
          <ListaVacia texto="No hubo ingresos en este mes." />
        ) : (
          datos.movimientos.map(m => {
            const nombre = (m.cliente_nombre ?? 'Cliente') + (m.cliente_eliminado ? ' (eliminado)' : '')
            const esVenta = m.tipo === 'venta'
            return (
              <Fila
                key={`${m.tipo}-${m.id}`}
                icono={esVenta ? Droplets : Banknote}
                iconoTono={esVenta ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}
                titulo={nombre}
                subtitulo={`${fechaCorta(m.fecha)} · ${esVenta ? `Venta de ${m.cantidad_bidones} ${m.cantidad_bidones === 1 ? 'bidón' : 'bidones'}` : 'Pago de saldo pendiente'}`}
                monto={`+${money(Number(m.monto))}`}
                montoTono="text-emerald-600"
                href={m.cliente_eliminado ? undefined : `/clientes/${m.cliente_id}`}
              />
            )
          })
        )}
      </Seccion>

      <HistorialMeses
        filas={datos.meses.map(m => ({
          mes: m.mes,
          valor: Number(m.total),
          detalle: `Ventas ${money(Number(m.ventas))} · Cobros de deuda ${money(Number(m.cobros))}`,
        }))}
        mesSeleccionado={datos.mes}
        onSeleccionar={seleccionarMes}
        formato={(v) => money(v)}
        colorBarra="bg-emerald-500"
      />
    </PantallaFinanzas>
  )
}
