'use client'

import { Droplets, UserMinus, UserPlus } from 'lucide-react'
import { Dato, EstadoCarga, Fila, HistorialMeses, ListaVacia, PantallaFinanzas, Seccion, TarjetaMes } from '@/components/finanzas/Historial'
import { money } from '@/lib/clientes'
import { fechaCorta, nombreMes } from '@/lib/fechas'
import { useHistorialMensual } from '@/lib/finanzas'

interface MesClientes {
  mes: string;
  // Clientes dados de alta y no eliminados al terminar el mes
  activos: number;
  nuevos: number;
  bajas: number;
  // Clientes distintos que recibieron al menos una entrega
  atendidos: number;
  entregas: number;
  bidones: number;
}

interface ClienteAtendido {
  id: number;
  nombre: string | null;
  eliminado: boolean;
  entregas: number;
  bidones: number;
  pagado: string;
}

interface AltaBaja {
  id: number;
  nombre: string;
  fecha: string;
  eliminado: boolean;
}

interface DatosClientes {
  mes: string;
  meses: MesClientes[];
  atendidos: ClienteAtendido[];
  altas: AltaBaja[];
  bajas: AltaBaja[];
}

const plural = (n: number, singular: string, pluralTxt: string) => `${n} ${n === 1 ? singular : pluralTxt}`

export default function ClientesFinanzasPage() {
  const { datos, cargando, error, seleccionarMes } = useHistorialMensual<DatosClientes>('/finanzas/clientes')

  if (!datos) {
    return <PantallaFinanzas etiqueta="Finanzas" titulo="Clientes"><EstadoCarga error={error} /></PantallaFinanzas>
  }

  const indice = datos.meses.findIndex(m => m.mes === datos.mes)
  const resumen = datos.meses[indice]
  const esMesEnCurso = indice === 0

  return (
    <PantallaFinanzas etiqueta="Finanzas" titulo="Clientes">
      <TarjetaMes
        titulo={esMesEnCurso ? 'Clientes activos hoy' : `Clientes activos al cierre de ${nombreMes(datos.mes)}`}
        valor={(resumen?.activos ?? 0).toString()}
        valorTono="text-sky-600"
        meses={datos.meses.map(m => m.mes)}
        mes={datos.mes}
        onCambiarMes={seleccionarMes}
        actualizando={cargando}
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Dato etiqueta="Nuevos" valor={`+${resumen?.nuevos ?? 0}`} tono="text-emerald-600" />
          <Dato etiqueta="Dados de baja" valor={`-${resumen?.bajas ?? 0}`} tono="text-rose-500" />
          <Dato etiqueta="Atendidos" valor={(resumen?.atendidos ?? 0).toString()} />
          <Dato etiqueta="Entregas" valor={(resumen?.entregas ?? 0).toString()} />
          <Dato etiqueta="Bidones entregados" valor={(resumen?.bidones ?? 0).toString()} />
        </div>
      </TarjetaMes>

      {error && <p className="text-center text-xs font-semibold text-red-500">No se pudo cargar el mes elegido.</p>}

      <Seccion etiqueta="Detalle" titulo={`Clientes atendidos en ${nombreMes(datos.mes)}`}>
        {datos.atendidos.length === 0 ? (
          <ListaVacia texto="No hubo entregas en este mes." />
        ) : (
          datos.atendidos.map(c => (
            <Fila
              key={c.id}
              icono={Droplets}
              iconoTono="bg-sky-50 text-sky-600"
              titulo={(c.nombre ?? 'Cliente') + (c.eliminado ? ' (eliminado)' : '')}
              subtitulo={`${plural(c.entregas, 'entrega', 'entregas')} · pagó ${money(Number(c.pagado))}`}
              monto={plural(c.bidones, 'bidón', 'bidones')}
              href={c.eliminado ? undefined : `/clientes/${c.id}`}
            />
          ))
        )}
      </Seccion>

      <Seccion titulo="Altas y bajas">
        {datos.altas.length === 0 && datos.bajas.length === 0 ? (
          <ListaVacia texto="No hubo clientes nuevos ni dados de baja en este mes." />
        ) : (
          <>
            {datos.altas.map(c => (
              <Fila
                key={`alta-${c.id}`}
                icono={UserPlus}
                iconoTono="bg-emerald-50 text-emerald-600"
                titulo={c.nombre + (c.eliminado ? ' (eliminado)' : '')}
                subtitulo={`Alta el ${fechaCorta(c.fecha)}`}
                monto="Nuevo"
                montoTono="text-emerald-600"
                href={c.eliminado ? undefined : `/clientes/${c.id}`}
              />
            ))}
            {datos.bajas.map(c => (
              <Fila
                key={`baja-${c.id}`}
                icono={UserMinus}
                iconoTono="bg-rose-50 text-rose-500"
                titulo={c.nombre}
                subtitulo={`Eliminado el ${fechaCorta(c.fecha)}`}
                monto="Baja"
                montoTono="text-rose-500"
              />
            ))}
          </>
        )}
      </Seccion>

      <HistorialMeses
        filas={datos.meses.map(m => ({
          mes: m.mes,
          valor: m.activos,
          detalle: [
            `${m.atendidos} atendidos`,
            plural(m.bidones, 'bidón', 'bidones'),
            m.nuevos > 0 ? plural(m.nuevos, 'nuevo', 'nuevos') : null,
            m.bajas > 0 ? plural(m.bajas, 'baja', 'bajas') : null,
          ].filter(Boolean).join(' · '),
        }))}
        mesSeleccionado={datos.mes}
        onSeleccionar={seleccionarMes}
        formato={(v) => plural(v, 'cliente', 'clientes')}
        colorBarra="bg-sky-500"
      />
    </PantallaFinanzas>
  )
}
