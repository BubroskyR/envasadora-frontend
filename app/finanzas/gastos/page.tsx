'use client'

import { ReceiptText } from 'lucide-react'
import { EstadoCarga, Fila, HistorialMeses, ListaVacia, PantallaFinanzas, Seccion, TarjetaMes } from '@/components/finanzas/Historial'
import { money } from '@/lib/clientes'
import { fechaCorta, nombreMes } from '@/lib/fechas'
import { useHistorialMensual } from '@/lib/finanzas'

interface MesGastos {
  mes: string;
  total: string;
  cantidad: number;
}

interface CategoriaGasto {
  categoria: string;
  total: string;
  cantidad: number;
}

interface Gasto {
  id: number;
  fecha: string;
  categoria: string | null;
  descripcion: string | null;
  monto: string;
}

interface DatosGastos {
  mes: string;
  meses: MesGastos[];
  categorias: CategoriaGasto[];
  gastos: Gasto[];
}

export default function GastosPage() {
  const { datos, cargando, error, seleccionarMes } = useHistorialMensual<DatosGastos>('/finanzas/gastos')

  if (!datos) {
    return <PantallaFinanzas etiqueta="Finanzas" titulo="Gastos"><EstadoCarga error={error} /></PantallaFinanzas>
  }

  const resumen = datos.meses.find(m => m.mes === datos.mes)
  const totalMes = Number(resumen?.total ?? 0)

  return (
    <PantallaFinanzas etiqueta="Finanzas" titulo="Gastos">
      <TarjetaMes
        titulo={`Gastos de ${nombreMes(datos.mes)}`}
        valor={money(totalMes)}
        valorTono="text-slate-900"
        meses={datos.meses.map(m => m.mes)}
        mes={datos.mes}
        onCambiarMes={seleccionarMes}
        actualizando={cargando}
      >
        {/* En qué se fue la plata: cada categoría con su parte del total */}
        {datos.categorias.length === 0 ? (
          <p className="text-sm text-slate-500">No hubo gastos en este mes.</p>
        ) : (
          <div className="space-y-3">
            {datos.categorias.map(c => {
              const total = Number(c.total)
              const porcentaje = totalMes > 0 ? Math.round((total / totalMes) * 100) : 0
              return (
                <div key={c.categoria}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-700">{c.categoria} <span className="font-medium text-slate-400">· {c.cantidad} {c.cantidad === 1 ? 'gasto' : 'gastos'}</span></span>
                    <span className="font-extrabold text-slate-900">{money(total)} <span className="font-medium text-slate-400">({porcentaje}%)</span></span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-rose-400" style={{ width: `${porcentaje}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TarjetaMes>

      {error && <p className="text-center text-xs font-semibold text-red-500">No se pudo cargar el mes elegido.</p>}

      <Seccion etiqueta="Detalle" titulo={`Gastos de ${nombreMes(datos.mes)}`}>
        {datos.gastos.length === 0 ? (
          <ListaVacia texto="No hubo gastos en este mes." />
        ) : (
          datos.gastos.map(g => (
            <Fila
              key={g.id}
              icono={ReceiptText}
              iconoTono="bg-rose-50 text-rose-500"
              titulo={g.categoria || 'Varios'}
              subtitulo={`${fechaCorta(g.fecha)}${g.descripcion ? ` · ${g.descripcion}` : ''}`}
              monto={`-${money(Number(g.monto))}`}
              montoTono="text-rose-500"
            />
          ))
        )}
      </Seccion>

      <HistorialMeses
        filas={datos.meses.map(m => ({
          mes: m.mes,
          valor: Number(m.total),
          detalle: `${m.cantidad} ${m.cantidad === 1 ? 'gasto' : 'gastos'}`,
        }))}
        mesSeleccionado={datos.mes}
        onSeleccionar={seleccionarMes}
        formato={(v) => money(v)}
        colorBarra="bg-rose-400"
      />
    </PantallaFinanzas>
  )
}
