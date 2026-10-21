'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { HomeIcon, ContactsIcon, AdvanceIcon, GroupsIcon, SettingsIcon } from '@/components/ui/Icons'

const items = [
  { href: '/home', label: 'Home', Icon: HomeIcon },
  { href: '/contacts', label: 'Contacts', Icon: ContactsIcon },
  { href: '/campaigns', label: 'Advance', Icon: AdvanceIcon },
  { href: '/community', label: 'Groups', Icon: GroupsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-ink-100/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1.5 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'tap-target relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider transition-colors',
                active ? 'text-brand-600' : 'text-ink-400 active:text-ink-600'
              )}
            >
              {active && (
                <span className="absolute -top-2 h-[3px] w-[3px] rounded-full bg-brand-500 shadow-[0_0_6px_1px_rgb(255_46_62_/_0.6)]" />
              )}
              <item.Icon className={clsx('h-[19px] w-[19px] transition-transform', active && 'scale-110')} aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
