import { useEffect, useState } from 'react'

const supported = () =>
  import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)

/**
 * Registers the offline service worker and reports when a newer version has been downloaded.
 * The new version is activated only after the user confirms, then the page reloads once.
 */
// Set only when the user confirms the update, so the first install (clients.claim) doesn't reload the page.
let updateRequested = false

export function useAppUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!supported()) return
    let registration: ServiceWorkerRegistration | undefined

    const track = (worker: ServiceWorker | null) => {
      if (!worker) return
      const check = () => {
        // Without a controller this is the first install, not an update.
        if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker)
      }
      check()
      worker.addEventListener('statechange', check)
    }

    const onControllerChange = () => {
      if (!updateRequested) return
      updateRequested = false
      window.location.reload()
    }

    // Home-screen apps on iOS are resumed rather than reloaded, so check again whenever they come back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {})
    }

    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        registration = reg
        track(reg.waiting)
        reg.addEventListener('updatefound', () => track(reg.installing))
      })
      .catch(() => {})

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return {
    updateAvailable: waiting !== null,
    applyUpdate: () => {
      updateRequested = true
      waiting?.postMessage('SKIP_WAITING')
    },
  }
}
