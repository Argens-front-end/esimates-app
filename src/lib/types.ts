export interface EstimateRow {
  id: string
  name: string
  unit: string
  quantity: number
  price: number
}

export interface Estimate {
  id: string
  title: string
  currency: string
  rows: EstimateRow[]
  createdAt: string
  updatedAt: string
}

export const CURRENCIES = ['USD', 'EUR', 'BYN'] as const

export const DEFAULT_CURRENCY: (typeof CURRENCIES)[number] = 'USD'

export const UNITS = ['шт', 'м', 'м²', 'м³', 'м.п.', 'кг', 'т', 'л', 'ч', 'компл', 'усл', 'упак'] as const
