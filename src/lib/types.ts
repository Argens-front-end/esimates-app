export interface EstimateRow {
  id: string
  name: string
  unit: string
  quantity: number
  price: number
}

/** A construction site / object that groups estimates. */
export interface Project {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Estimate {
  id: string
  /** Every estimate belongs to a project. */
  projectId: string
  title: string
  currency: string
  rows: EstimateRow[]
  createdAt: string
  updatedAt: string
}

/** Invoice line linked to an estimate of the same project; its amount always follows the estimate total. */
export interface InvoiceEstimateLine {
  id: string
  type: 'estimate'
  estimateId: string
}

/** Free-form invoice line: just a name and an amount in the invoice currency. */
export interface InvoiceItemLine {
  id: string
  type: 'item'
  name: string
  amount: number
}

export type InvoiceLine = InvoiceEstimateLine | InvoiceItemLine

export interface Invoice {
  id: string
  projectId: string
  title: string
  /** Assigned automatically on creation (next number within the project); not editable. */
  number: string
  /** Currency of item lines; not editable, taken from the project's estimates on creation. */
  currency: string
  lines: InvoiceLine[]
  createdAt: string
  updatedAt: string
}

export const CURRENCIES = ['USD', 'EUR', 'BYN'] as const

export const DEFAULT_CURRENCY: (typeof CURRENCIES)[number] = 'USD'

export const UNITS = ['шт', 'м', 'м²', 'м³', 'м.п.', 'кг', 'т', 'л', 'ч', 'компл', 'усл', 'упак'] as const
