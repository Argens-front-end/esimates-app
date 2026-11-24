import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const ChevronLeft = (p: IconProps) => (
  <svg viewBox="0 0 12 20" {...base({ strokeWidth: 2.6, ...p })}>
    <path d="M10 2 2 10l8 8" />
  </svg>
)

export const ChevronRight = (p: IconProps) => (
  <svg viewBox="0 0 8 14" {...base({ strokeWidth: 2, ...p })}>
    <path d="m1.5 1.5 5 5.5-5 5.5" />
  </svg>
)

export const ChevronUpDown = (p: IconProps) => (
  <svg viewBox="0 0 10 16" {...base({ strokeWidth: 1.8, ...p })}>
    <path d="m1.5 5.5 3.5-3.5 3.5 3.5M1.5 10.5 5 14l3.5-3.5" />
  </svg>
)

export const Plus = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base({ strokeWidth: 2.2, ...p })}>
    <path d="M10 3v14M3 10h14" />
  </svg>
)

export const PlusCircleFill = (p: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const Ellipsis = (p: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="7.5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="16.5" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

export const Search = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base({ strokeWidth: 2, ...p })}>
    <circle cx="8.5" cy="8.5" r="6" />
    <path d="m13 13 5 5" />
  </svg>
)

export const XCircleFill = (p: IconProps) => (
  <svg viewBox="0 0 20 20" aria-hidden {...p}>
    <circle cx="10" cy="10" r="9" fill="currentColor" />
    <path d="m7 7 6 6m0-6-6 6" stroke="var(--card)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const Trash = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
)

export const Copy = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
)

export const Table = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M3.5 15h17M9.5 9.5V20" />
  </svg>
)

export const Share = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
)

export const ArrowUp = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 2, ...p })}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
)

export const ArrowDown = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 2, ...p })}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
)

export const DocText = (p: IconProps) => (
  <svg viewBox="0 0 48 48" {...base({ strokeWidth: 2.4, ...p })}>
    <path d="M12 5h17l9 9v27a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    <path d="M29 5v9h9M17 24h14M17 30h14M17 36h8" />
  </svg>
)

export const Folder = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
)

export const FolderPlus = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <path d="M12 10v6M9 13h6" />
  </svg>
)

export const Receipt = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 1.8, ...p })}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </svg>
)
