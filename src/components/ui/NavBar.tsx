import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  title?: ReactNode
  /** Large iOS-style title rendered under the bar; the compact title fades in once it scrolls away. */
  largeTitle?: boolean
  left?: ReactNode
  right?: ReactNode
  children?: ReactNode
}

function useScrolledPast(px: number) {
  const [past, setPast] = useState(() => window.scrollY > px)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > px)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [px])
  return past
}

export function NavBar({ title, largeTitle, left, right, children }: Props) {
  const scrolled = useScrolledPast(largeTitle ? 32 : 2)
  const showCompact = !largeTitle || scrolled

  return (
    <>
      <header
        className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
          scrolled ? 'border-b-[0.5px] border-sep bg-bar backdrop-blur-xl backdrop-saturate-180' : 'border-b-[0.5px] border-transparent bg-bg'
        }`}
      >
        <div className="mx-auto grid h-10 max-w-2xl grid-cols-[1fr_auto_1fr] items-center px-1.5">
          <div className="flex min-w-0 justify-start">{left}</div>
          <div
            className={`max-w-[55vw] truncate text-center text-[15px] font-semibold transition-opacity duration-200 sm:max-w-sm ${
              showCompact ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {title}
          </div>
          <div className="flex min-w-0 justify-end">{right}</div>
        </div>
      </header>
      {largeTitle && (
        <div className="mx-auto max-w-2xl px-3.5 pt-0 pb-1.5">
          <h1 className="text-[26px] leading-8 font-bold tracking-[0.3px]">{title}</h1>
          {children}
        </div>
      )}
    </>
  )
}

export function BarButton({
  children,
  onClick,
  bold,
  disabled,
  label,
}: {
  children: ReactNode
  onClick?: () => void
  bold?: boolean
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 min-w-10 items-center gap-0.5 px-2 text-[15px] text-tint transition-opacity active:opacity-30 disabled:text-label3 ${
        bold ? 'font-semibold' : ''
      }`}
    >
      {children}
    </button>
  )
}
