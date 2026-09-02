'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const items = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/contacts', label: 'Contacts', icon: '👥' },
  { href: '/campaigns', label: 'Campaigns', icon: '📣' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
                active ? 'text-brand-600' : 'text-ink-400'
              )}
            >
              <span className="text-xl leading-none" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
