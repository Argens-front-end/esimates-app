import type { Estimate, Invoice, Project } from './types'
import { type Totals, addToTotals, rowSum } from './money'
import { invoiceLabel, resolveLines } from './invoice'
import { exportDocToExcel } from './exportExcel'
import { exportDocToMarkdown, exportDocToText } from './exportText'

export type ExportFormat = 'excel' | 'markdown' | 'text'

export const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'excel', label: 'Excel (.xlsx)' },
  { format: 'markdown', label: 'Markdown (.md)' },
  { format: 'text', label: 'Текст (.txt)' },
]

export interface ExportRow {
  name: string
  unit: string
  quantity: number
  price: number
  currency: string
}

/** Format-independent document: an estimate or an invoice flattened into priced rows. */
export interface ExportDoc {
  /** First line of the document, e.g. "Смета" or "Инвойс № 3". */
  heading: string
  title: string
  fileName: string
  /** Shown for the total when there are no rows. */
  currency: string
  /** `full` — name, unit, price, quantity, sum; `amounts` — name and sum only. */
  layout: 'full' | 'amounts'
  rows: ExportRow[]
}

export function docTotals(doc: ExportDoc): Totals {
  const totals: Totals = new Map()
  for (const r of doc.rows) addToTotals(totals, r.currency, rowSum(r))
  if (totals.size === 0) totals.set(doc.currency, 0)
  return totals
}

/** File names start with the project title, e.g. "Дом на Ленина — Кровля". */
const withProject = (project: Project | undefined, name: string) =>
  project?.title ? `${project.title} — ${name}` : name

export const estimateDoc = (estimate: Estimate, project: Project | undefined): ExportDoc => ({
  heading: 'Смета',
  title: estimate.title,
  fileName: withProject(project, estimate.title || 'Смета'),
  currency: estimate.currency,
  layout: 'full',
  rows: estimate.rows.map((r) => ({ ...r, currency: estimate.currency })),
})

/** Each line is exported as a name and an amount; lines of deleted estimates are skipped. */
export const invoiceDoc = (invoice: Invoice, estimates: Estimate[], project: Project | undefined): ExportDoc => ({
  heading: `Инвойс${invoice.number ? ` № ${invoice.number}` : ''}`,
  title: invoice.title,
  fileName: withProject(project, invoiceLabel(invoice)),
  currency: invoice.currency,
  layout: 'amounts',
  rows: resolveLines(invoice, estimates).flatMap((r) =>
    r.missing
      ? []
      : [
          {
            name: r.line.type === 'estimate' ? `Смета «${r.name}»` : r.name,
            unit: '',
            quantity: 1,
            price: r.amount,
            currency: r.currency,
          },
        ],
  ),
})

export function exportDoc(doc: ExportDoc, format: ExportFormat) {
  switch (format) {
    case 'excel':
      return exportDocToExcel(doc)
    case 'markdown':
      return exportDocToMarkdown(doc)
    case 'text':
      return exportDocToText(doc)
  }
}
