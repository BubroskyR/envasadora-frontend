import type { Metadata } from 'next'
import './globals.css'
import { BottomNavigation } from '@/components/BottomNavigation'

export const metadata: Metadata = {
  title: 'Envasadora Aguas Mas',
  description: 'Sistema de gestión para la envasadora',
  // ¡NUEVO! Configuraciones específicas para PWA y Apple/iOS
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aguas Mas",
  },
  formatDetection: {
    telephone: false, // Evita que iOS convierta los números (como IDs) en links telefónicos azules
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {/* Envolvemos el contenido principal con un padding inferior (pb-20 o pb-24) 
            para que la barra fija no tape el contenido del final de tus páginas */}
        <div className="pb-24">
          {children}
        </div>
        
        {/* Aquí renderizamos la barra de navegación en toda la app */}
        <BottomNavigation />
      </body>
    </html>
  )
}