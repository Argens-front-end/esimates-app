import { createPortal } from 'react-dom'
import { useAppUpdate } from '../lib/pwa'

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useAppUpdate()
  if (!updateAvailable) return null

  return createPortal(
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+48px)] z-40 flex justify-center px-3">
      <div
        role="status"
        className="flex animate-fade-in items-center gap-3 rounded-full bg-card/90 py-1.5 pr-1.5 pl-4 text-[13px] shadow-lg ring-[0.5px] ring-sep backdrop-blur-xl"
      >
        Доступна новая версия
        <button
          type="button"
          onClick={applyUpdate}
          className="h-7 rounded-full bg-tint px-3 text-[13px] font-semibold text-white active:opacity-70"
        >
          Обновить
        </button>
      </div>
    </div>,
    document.body,
  )
}
