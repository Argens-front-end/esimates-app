import { useSyncExternalStore } from 'react'

export type Route =
  | { page: 'list' }
  | { page: 'edit'; id: string }
  /** `rowId: null` means a new row is being added. */
  | { page: 'row'; id: string; rowId: string | null }

interface HistoryState {
  depth?: number
  scroll?: number
}

const NAV_EVENT = 'app:navigate'
let lastNavigation: 'push' | 'replace' | 'pop' = 'pop'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.addEventListener('popstate', () => {
  lastNavigation = 'pop'
})

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  window.addEventListener(NAV_EVENT, cb)
  return () => {
    window.removeEventListener('hashchange', cb)
    window.removeEventListener(NAV_EVENT, cb)
  }
}

const parse = (hash: string): Route => {
  const row = hash.match(/^#\/estimate\/([^/]+)\/row\/([^/]+)$/)
  if (row) {
    const rowId = decodeURIComponent(row[2])
    return { page: 'row', id: decodeURIComponent(row[1]), rowId: rowId === 'new' ? null : rowId }
  }
  const edit = hash.match(/^#\/estimate\/([^/]+)$/)
  return edit ? { page: 'edit', id: decodeURIComponent(edit[1]) } : { page: 'list' }
}

const toHash = (route: Route) => {
  if (route.page === 'list') return '#/'
  const base = `#/estimate/${encodeURIComponent(route.id)}`
  return route.page === 'edit' ? base : `${base}/row/${route.rowId === null ? 'new' : encodeURIComponent(route.rowId)}`
}

export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, () => window.location.hash))
}

/** How the current route was reached: `pop` means browser back/forward (or initial load). */
export const getLastNavigation = () => lastNavigation

/** Scroll position saved for the current history entry when the user navigated away from it. */
export const getSavedScroll = () => (history.state as HistoryState | null)?.scroll

export const navigate = (route: Route, { replace = false } = {}) => {
  const state = (history.state as HistoryState | null) ?? {}
  if (replace) {
    history.replaceState({ depth: state.depth ?? 0 }, '', toHash(route))
  } else {
    history.replaceState({ ...state, scroll: window.scrollY }, '')
    history.pushState({ depth: (state.depth ?? 0) + 1 }, '', toHash(route))
  }
  lastNavigation = replace ? 'replace' : 'push'
  window.dispatchEvent(new Event(NAV_EVENT))
}

/** Returns to the previous in-app screen, or replaces the current one with `fallback` if there is none (e.g. opened via direct link). */
export const goBack = (fallback: Route) => {
  if (((history.state as HistoryState | null)?.depth ?? 0) > 0) history.back()
  else navigate(fallback, { replace: true })
}
