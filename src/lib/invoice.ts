import type { Estimate, Invoice, InvoiceLine } from './types'
import { type Totals, addToTotals, estimateTotal, formatTotalsMap, round2 } from './money'

export const invoiceLabel = (invoice: Invoice) =>
  invoice.title || (invoice.number ? `Инвойс № ${invoice.number}` : 'Без названия')

export interface ResolvedLine {
  line: InvoiceLine
  name: string
  amount: number
  currency: string
  /** Linked estimate; `undefined` for item lines and for estimates that were deleted. */
  estimate?: Estimate
  /** Estimate line whose estimate no longer exists. */
  missing: boolean
}

export function resolveLines(invoice: Invoice, estimates: Estimate[]): ResolvedLine[] {
  const byId = new Map(estimates.map((e) => [e.id, e]))
  return invoice.lines.map((line) => {
    if (line.type === 'item') {
      return { line, name: line.name, amount: round2(line.amount), currency: invoice.currency, missing: false }
    }
    const estimate = byId.get(line.estimateId)
    return {
      line,
      name: estimate ? estimate.title || 'Без названия' : 'Смета удалена',
      amount: estimate ? estimateTotal(estimate) : 0,
      currency: estimate?.currency ?? invoice.currency,
      estimate,
      missing: !estimate,
    }
  })
}

export function invoiceTotals(invoice: Invoice, estimates: Estimate[]): Totals {
  const totals: Totals = new Map()
  for (const r of resolveLines(invoice, estimates)) if (!r.missing) addToTotals(totals, r.currency, r.amount)
  return totals
}

export const formatInvoiceTotal = (invoice: Invoice, estimates: Estimate[]) =>
  formatTotalsMap(invoiceTotals(invoice, estimates), invoice.currency)

/** Item lines saved by earlier versions had quantity × price; converts them to a single amount. */
export function upgradeInvoice(invoice: Invoice): Invoice {
  if (invoice.lines.every((l) => l.type !== 'item' || typeof l.amount === 'number')) return invoice
  return {
    ...invoice,
    lines: invoice.lines.map((l) => {
      if (l.type !== 'item' || typeof l.amount === 'number') return l
      const legacy = l as unknown as { quantity?: number; price?: number }
      return { id: l.id, type: 'item', name: l.name, amount: round2((legacy.quantity ?? 0) * (legacy.price ?? 0)) }
    }),
  }
}
