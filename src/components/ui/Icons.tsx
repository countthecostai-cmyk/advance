import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function ContactsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15 20a4.3 4.3 0 0 1 7.5-3" />
    </svg>
  )
}

export function GroupsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M8 14h3" />
      <path d="M8 17h6" />
    </svg>
  )
}

export function AdvanceIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h13" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.8 1.8 0 0 0 .36 1.98l.07.07a2.2 2.2 0 1 1-3.1 3.1l-.07-.07a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.65V20a2.2 2.2 0 1 1-4.4 0v-.1a1.8 1.8 0 0 0-1.18-1.65 1.8 1.8 0 0 0-1.98.36l-.07.07a2.2 2.2 0 1 1-3.1-3.1l.07-.07a1.8 1.8 0 0 0 .36-1.98A1.8 1.8 0 0 0 1.3 12.4H1.2a2.2 2.2 0 1 1 0-4.4h.1a1.8 1.8 0 0 0 1.65-1.18 1.8 1.8 0 0 0-.36-1.98l-.07-.07a2.2 2.2 0 1 1 3.1-3.1l.07.07a1.8 1.8 0 0 0 1.98.36H7.7A1.8 1.8 0 0 0 9.38 1.3V1.2a2.2 2.2 0 1 1 4.4 0v.1a1.8 1.8 0 0 0 1.08 1.65h.02a1.8 1.8 0 0 0 1.98-.36l.07-.07a2.2 2.2 0 1 1 3.1 3.1l-.07.07a1.8 1.8 0 0 0-.36 1.98v.02a1.8 1.8 0 0 0 1.65 1.08h.1a2.2 2.2 0 1 1 0 4.4h-.1a1.8 1.8 0 0 0-1.65 1.08Z" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.6} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}
