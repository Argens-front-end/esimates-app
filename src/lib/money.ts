import type { Estimate, EstimateRow } from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const rowSum = (row: EstimateRow) => round2(row.quantity * row.price)

export const estimateTotal = (estimate: Estimate) =>
  round2(estimate.rows.reduce((acc, row) => acc + rowSum(row), 0))

export function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value)
  } catch {
    return `${formatNumber(value)} ${currency}`
  }
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)

export function currencySymbol(currency: string) {
  try {
    const part = new Intl.NumberFormat('ru-RU', { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency')
    return part?.value ?? currency
  } catch {
    return currency
  }
}

export function currencyName(currency: string) {
  try {
    return new Intl.DisplayNames('ru', { type: 'currency' }).of(currency) ?? currency
  } catch {
    return currency
  }
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export function formatShortDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}
