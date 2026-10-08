import { MetadataRoute } from 'next'

// Chrome en Android solo ofrece "Instalar" si el manifest tiene íconos PNG de 192x192 y 512x512
// que realmente existan en /public. Si alguno da 404, muestra "Esta aplicación no se puede instalar".
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Aguas Mas Logística',
    short_name: 'Aguas Mas',
    description: 'Sistema de gestión de reparto',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7faff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        // Con margen extra: Android lo recorta en círculo u otras formas según el teléfono
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}
