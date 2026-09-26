import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aguas Mas Logística',
    short_name: 'Aguas Mas',
    description: 'Sistema de gestión de reparto',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7faff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        src: '/icon512_maskable.png', // No te preocupes si no existe, lo generaremos después, pero Safari necesita verlo aquí.
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon512_rounded.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
  }
}