'use client'

import Link from 'next/link'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import L from 'leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { useEffect } from 'react'

import type { CustomerStatus } from '@/lib/clientes'

// Fondo del mapa: OpenFreeMap (gratis, sin clave ni límite de uso, permite uso comercial).
// Otros estilos disponibles cambiando solo el nombre al final: 'positron' (gris claro, minimalista),
// 'bright' (más colorido), 'dark' (oscuro).
const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty'
const ATRIBUCION = '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Datos de <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

// MapLibre dibuja el mapa en un proceso aparte (worker). Con webpack hay que decirle dónde quedó ese archivo;
// el "new URL(..., import.meta.url)" hace que webpack lo publique junto con la app.
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString())

// Marcadores dibujados en SVG con los colores de la app: no dependen de imágenes de otros sitios
const COLORES: Record<CustomerStatus, string> = {
  urgent: '#ef4444',
  soon: '#f59e0b',
  fresh: '#10b981',
}

const crearIcono = (color: string) => L.divIcon({
  className: '', // Sin la clase por defecto, que agrega un recuadro blanco
  html: `<svg width="30" height="40" viewBox="0 0 30 40" style="filter: drop-shadow(0 2px 3px rgba(15,23,42,.35))">
    <path d="M15 38.5S27 25.5 27 15a12 12 0 0 0-24 0c0 10.5 12 23.5 12 23.5z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="15" cy="15" r="4.5" fill="#fff"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 39],
  popupAnchor: [0, -36],
})

// Se crean una sola vez y se reutilizan, en lugar de crear un ícono nuevo por marcador en cada render
const iconos: Record<CustomerStatus, L.DivIcon> = {
  urgent: crearIcono(COLORES.urgent),
  soon: crearIcono(COLORES.soon),
  fresh: crearIcono(COLORES.fresh),
}

// Capa de fondo vectorial (MapLibre) dentro del mapa de Leaflet
function FondoMapa() {
  const map = useMap()

  useEffect(() => {
    const capa = maplibreGL({ style: ESTILO_MAPA, attributionControl: false }).addTo(map)
    map.attributionControl.addAttribution(ATRIBUCION)
    return () => {
      map.attributionControl.removeAttribution(ATRIBUCION)
      capa.remove()
    }
  }, [map])

  return null
}

interface ClienteProps {
  id: number;
  nombre: string;
  latitud?: string | null;
  longitud?: string | null;
  estado_agua: CustomerStatus;
}

export default function MapComponent({ clientes }: { clientes: ClienteProps[] }) {
  useEffect(() => {
    // Esto fuerza a Leaflet a recalcular su tamaño al cargar
    window.dispatchEvent(new Event('resize'));
  }, []);

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <MapContainer
        center={[-26.5369, -59.3406]} // Coordenadas de Libertador Gral. San Martín, Chaco
        zoom={14}
        style={{ height: '100%', width: '100%', zIndex: 0, background: '#f2efe9' }}
      >
        <FondoMapa />

        {clientes.map(cliente => {
          if (!cliente.latitud || !cliente.longitud) return null;

          return (
            <Marker
              key={cliente.id}
              position={[Number(cliente.latitud), Number(cliente.longitud)]}
              icon={iconos[cliente.estado_agua]}
            >
              <Popup>
                <div className="text-center">
                  {/* div y no p: Leaflet les pone márgenes grandes a los párrafos dentro de los globos */}
                  <div className="font-bold text-slate-800">{cliente.nombre}</div>
                  <Link href={`/clientes/${cliente.id}`} className="mt-1 inline-block text-xs font-semibold text-sky-600">
                    Ver cliente
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
