import { diasDesde } from './fechas'

// Los campos opcionales llegan como null cuando se dejaron vacíos al crear o editar el cliente:
// nunca usar .toLowerCase() ni otros métodos de texto sobre ellos sin chequear antes.
export interface Cliente {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono?: string | null;
  fecha_ultima_entrega: string | null;
  consumo_semanal_estimado: number;
  deuda_actual: string;
  barrio?: string | null;
  latitud?: string | null;
  longitud?: string | null;
}

// Lo mínimo que se necesita de /api/entregas para calcular el nivel de agua
export interface EntregaBasica {
  cliente_id: number;
  fecha: string;
  cantidad_bidones: number;
}

export type CustomerStatus = 'fresh' | 'soon' | 'urgent'

export interface EstadoAgua {
  level: number;
  status: CustomerStatus;
  statusLabel: string;
  detail: string;
  restante: string;
  // Días de agua que le quedan (negativo = ya se le terminó). Sirve para ordenar por urgencia.
  diasRestantes: number;
}

const plural = (n: number, singular: string, pluralTxt: string) => `${n} ${n === 1 ? singular : pluralTxt}`

// Bidones que recibió cada cliente en su última entrega (si hubo varias el mismo día, se suman).
export function bidonesUltimaEntregaPorCliente(entregas: EntregaBasica[]): Map<number, number> {
  const ultimaFecha = new Map<number, string>()
  const bidones = new Map<number, number>()
  for (const e of entregas) {
    const dia = e.fecha.slice(0, 10)
    const actual = ultimaFecha.get(e.cliente_id)
    if (!actual || dia > actual) {
      ultimaFecha.set(e.cliente_id, dia)
      bidones.set(e.cliente_id, Number(e.cantidad_bidones) || 0)
    } else if (dia === actual) {
      bidones.set(e.cliente_id, (bidones.get(e.cliente_id) ?? 0) + (Number(e.cantidad_bidones) || 0))
    }
  }
  return bidones
}

// Única fuente de verdad para saber cuánta agua le queda a un cliente.
// La usan la tarjeta de la ruta, el filtro "Urgentes", el orden de la lista y los colores del mapa.
//
// Idea: la última entrega le dura al cliente (bidones entregados ÷ consumo diario) días.
// El nivel es la parte de esa duración que todavía no pasó.
// Ej.: consume 2 bidones/semana y se le dejaron 2 → le duran 7 días; a los 4 días está al 43 %.
export function calcularEstado(
  cliente: Pick<Cliente, 'fecha_ultima_entrega' | 'consumo_semanal_estimado'>,
  bidonesUltimaEntrega?: number,
  ahora: Date = new Date()
): EstadoAgua {
  if (!cliente.fecha_ultima_entrega) {
    return { level: 0, status: 'urgent', statusLabel: 'Nunca entregado', detail: 'Falta entrega', restante: 'Sin datos', diasRestantes: -Infinity };
  }

  // Evita dividir por cero si un cliente tiene consumo 0 cargado.
  const consumoSemanal = cliente.consumo_semanal_estimado > 0 ? cliente.consumo_semanal_estimado : 1;
  // Si no sabemos cuántos bidones se dejaron, asumimos lo que consume en una semana.
  const bidones = bidonesUltimaEntrega && bidonesUltimaEntrega > 0 ? bidonesUltimaEntrega : consumoSemanal;

  const diasDuracion = bidones / (consumoSemanal / 7);
  const diasPasados = Math.max(0, diasDesde(cliente.fecha_ultima_entrega, ahora));
  const diasRestantes = Math.round(diasDuracion - diasPasados);
  const level = Math.min(100, Math.max(0, ((diasDuracion - diasPasados) / diasDuracion) * 100));

  let status: CustomerStatus = 'fresh';
  let statusLabel = 'Nivel óptimo';
  if (level <= 20) { status = 'urgent'; statusLabel = 'Entrega urgente'; }
  else if (level <= 50) { status = 'soon'; statusLabel = 'Próxima entrega'; }

  const detail = diasPasados === 0
    ? `Entregado hoy · ${plural(bidones, 'bidón', 'bidones')}`
    : `Hace ${plural(diasPasados, 'día', 'días')} · ${plural(bidones, 'bidón', 'bidones')}`;

  const restante = diasRestantes > 0
    ? `Le quedan ~${plural(diasRestantes, 'día', 'días')}`
    : diasRestantes === 0
      ? 'Se le termina hoy'
      : `Sin agua hace ~${plural(-diasRestantes, 'día', 'días')}`;

  return { level, status, statusLabel, detail, restante, diasRestantes };
}

export const money = (value: number) => `$${value.toLocaleString('es-AR')}`
