import type { createHashRouter } from 'react-router'

type Router = ReturnType<typeof createHashRouter>

/** Screen depth in the navigation hierarchy; decides whether a transition slides forward or back. */
function depth(pathname: string) {
  if (pathname === '/') return 0
  if (/^\/project\/[^/]+$/.test(pathname)) return 1
  if (/\/(row|line)\/[^/]+$/.test(pathname)) return 3
  return 2
}

/** Search-only navigations (e.g. switching project tabs) keep their own in-page animation. */
const isSearchOnly = (to: unknown) =>
  (typeof to === 'string' && to.startsWith('?')) || (typeof to === 'object' && to !== null && !('pathname' in to))

/**
 * Animates every page change with the View Transitions API (no-op where unsupported):
 * deeper screens slide in from the right, shallower ones from the left, same-level/replace navigations cross-fade.
 * Back navigations (`navigate(-1)`, browser back) are animated by React Router itself once the forward one was.
 */
export function enablePageTransitions(router: Router) {
  const navigate = router.navigate.bind(router)
  router.navigate = ((to: Parameters<Router['navigate']>[0], opts?: Parameters<Router['navigate']>[1]) =>
    typeof to === 'number' || isSearchOnly(to)
      ? navigate(to as never, opts)
      : navigate(to, { viewTransition: true, ...opts })) as Router['navigate']

  // Runs before RouterProvider's own subscriber starts the view transition, so CSS sees the direction in time.
  let prev = router.state.location.pathname
  router.subscribe((state) => {
    const next = state.location.pathname
    if (next === prev) return
    const d = depth(next) - depth(prev)
    document.documentElement.dataset.nav =
      state.historyAction === 'REPLACE' || d === 0 ? 'fade' : d > 0 ? 'forward' : 'back'
    prev = next
  })
}
