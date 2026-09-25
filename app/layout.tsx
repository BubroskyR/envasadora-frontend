import type { Metadata } from 'next'
import './globals.css'
// Si tu proyecto usa otra ruta, ajusta este import
import { BottomNavigation } from '@/components/BottomNavigation' 

export const metadata: Metadata = {
  title: 'Envasadora Aguas Mas',
  description: 'Sistema de gestión para la envasadora',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-[#f7faff]">
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