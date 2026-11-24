import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** `rowId: null` means a new row is being added (URL segment `new`). */
export const NEW_ROW = 'new'

export type ProjectTab = 'estimates' | 'invoices'

export const paths = {
  list: () => '/',
  project: (id: string, tab: ProjectTab = 'estimates') =>
    `/project/${encodeURIComponent(id)}${tab === 'invoices' ? '?tab=invoices' : ''}`,
  newProject: () => '/new-project',
  editProject: (id: string) => `${paths.project(id)}/edit`,
  estimate: (id: string) => `/estimate/${encodeURIComponent(id)}`,
  row: (id: string, rowId: string | null) =>
    `${paths.estimate(id)}/row/${rowId === null ? NEW_ROW : encodeURIComponent(rowId)}`,
  invoice: (id: string) => `/invoice/${encodeURIComponent(id)}`,
  invoiceLine: (id: string, lineId: string | null) =>
    `${paths.invoice(id)}/line/${lineId === null ? NEW_ROW : encodeURIComponent(lineId)}`,
}

/** Returns to the previous in-app screen, or replaces the current one with `fallback` if there is none (e.g. opened via direct link). */
export function useGoBack() {
  const navigate = useNavigate()
  const { key } = useLocation()
  return useCallback(
    (fallback: string) => {
      if (key !== 'default') void navigate(-1)
      else void navigate(fallback, { replace: true })
    },
    [key, navigate],
  )
}
