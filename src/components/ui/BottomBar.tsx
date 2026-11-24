import type { ReactNode } from 'react'

/** Translucent toolbar pinned to the bottom, respecting the home indicator safe area. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t-[0.5px] border-sep bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-180">
      <div className="mx-auto flex min-h-11 max-w-2xl items-center gap-2 px-1.5">{children}</div>
    </div>
  )
}
