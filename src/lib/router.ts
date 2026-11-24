import { useSyncExternalStore } from 'react'

export type Route = { page: 'list' } | { page: 'edit'; id: string }

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const match = hash.match(/^#\/estimate\/([^/]+)$/)
  return match ? { page: 'edit', id: decodeURIComponent(match[1]) } : { page: 'list' }
}

export const navigate = (route: Route) => {
  window.location.hash = route.page === 'edit' ? `/estimate/${encodeURIComponent(route.id)}` : '/'
}
