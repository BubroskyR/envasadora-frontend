'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

import type { CustomerStatus } from '@/lib/clientes'

// Arreglo para que los íconos de Leaflet se vean bien en Next.js
const crearIcono = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Se crean una sola vez y se reutilizan, en lugar de crear un ícono nuevo por marcador en cada render
const iconos: Record<CustomerStatus, L.Icon> = {
  urgent: crearIcono('red'),
  soon: crearIcono('gold'),
  fresh: crearIcono('green'),
};

interface ClienteProps {
  id: number;
  nombre: string;
  latitud?: string;
  longitud?: string;
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
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {clientes.map(cliente => {
          if (!cliente.latitud || !cliente.longitud) return null;

          return (
            <Marker 
              key={cliente.id} 
              position={[Number(cliente.latitud), Number(cliente.longitud)]}
              icon={iconos[cliente.estado_agua]}
            >
              <Popup>
                <div className="text-center font-bold text-slate-800">
                  {cliente.nombre}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}