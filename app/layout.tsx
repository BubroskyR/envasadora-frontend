import type { Metadata } from 'next'
import './globals.css'
import { AuthGate } from '@/components/AuthGate'

export const metadata: Metadata = {
  title: 'Envasadora Aguas Mas',
  description: 'Sistema de gestión para la envasadora',
  // ¡NUEVO! Configuraciones específicas para PWA y Apple/iOS
  manifest: "/manifest.webmanifest",
  // Ícono que usa iPhone/iPad al "Agregar a pantalla de inicio" (no lee los íconos del manifest)
  icons: {
    apple: '/apple-touch-icon.png',
  },
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
        {/* AuthGate pide iniciar sesión y, ya dentro, muestra el contenido con la barra de navegación */}
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  )
}