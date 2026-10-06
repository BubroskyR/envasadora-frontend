'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSesion } from '@/lib/api'
import { BottomNavigation } from '@/components/BottomNavigation'

// Envuelve toda la app: si no hay sesión iniciada, manda a /login antes de mostrar (y cargar) cualquier pantalla.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const esLogin = pathname === '/login'
  const conSesion = useSesion()

  useEffect(() => {
    if (conSesion === false && !esLogin) router.replace('/login')
  }, [conSesion, esLogin, router])

  if (esLogin) return <>{children}</>
  // Mientras no se sabe si hay sesión (o si no la hay), no se muestra nada para no disparar peticiones sin token
  if (!conSesion) return null

  return (
    <>
      {/* Padding inferior para que la barra fija no tape el contenido del final de las páginas */}
      <div className="pb-24">
        {children}
      </div>
      <BottomNavigation />
    </>
  )
}
