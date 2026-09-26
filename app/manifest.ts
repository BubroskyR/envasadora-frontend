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
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}