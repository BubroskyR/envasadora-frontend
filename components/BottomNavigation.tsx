'use client'

import Link from 'next/link'
import { BarChart3, Map, Truck, Settings } from 'lucide-react' // Cambiamos User por Settings
import { usePathname } from 'next/navigation'

const navigationItems = [
  { label: 'Ruta', href: '/', icon: Truck },
  { label: 'Mapa', href: '/rutas', icon: Map },
  { label: 'Finanzas', href: '/finanzas', icon: BarChart3 },
  { label: 'Ajustes', href: '/ajustes', icon: Settings }, // Actualizamos el enlace aquí
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white/90 pb-4 shadow-[0_-4px_18px_rgba(15,23,42,0.08)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-2xl justify-around">
        {navigationItems.map((item) => {
          const Icon = item.icon
          // También queda marcada en sus subpantallas (ej. /finanzas/ingresos marca "Finanzas")
          const isActive = item.href !== '#' && (pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)))

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}