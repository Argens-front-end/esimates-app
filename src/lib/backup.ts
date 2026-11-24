import type { Estimate, EstimateRow, Invoice, InvoiceLine, Project } from './types'
import { saveFile } from './saveFile'
import { uid } from './storage'

const FORMAT = 'smety-backup'
const VERSION = 3

export interface BackupData {
  projects: Project[]
  estimates: Estimate[]
  invoices: Invoice[]
}

export async function exportBackup({ projects, estimates, invoices }: BackupData) {
  const payload = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), projects, estimates, invoices }
  const date = new Date().toISOString().slice(0, 10)
  await saveFile(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `Сметы-резервная-копия-${date}.json`,
  )
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function normalizeRow(v: unknown): EstimateRow | null {
  if (!isObj(v)) return null
  return { id: str(v.id) || uid(), name: str(v.name), unit: str(v.unit, 'шт'), quantity: num(v.quantity), price: num(v.price) }
}

function normalizeEstimate(v: unknown): Estimate | null {
  if (!isObj(v) || typeof v.id !== 'string' || !Array.isArray(v.rows)) return null
  const now = new Date().toISOString()
  return {
    id: v.id,
    // Empty for v1 backups; storage moves such estimates into a fallback project on import.
    projectId: str(v.projectId),
    title: str(v.title),
    currency: str(v.currency, 'USD'),
    rows: v.rows.map(normalizeRow).filter((r): r is EstimateRow => r !== null),
    createdAt: str(v.createdAt, now),
    updatedAt: str(v.updatedAt, now),
  }
}

function normalizeProject(v: unknown): Project | null {
  if (!isObj(v) || typeof v.id !== 'string') return null
  const now = new Date().toISOString()
  return {
    id: v.id,
    title: str(v.title),
    createdAt: str(v.createdAt, now),
    updatedAt: str(v.updatedAt, now),
  }
}

function normalizeLine(v: unknown): InvoiceLine | null {
  if (!isObj(v)) return null
  if (v.type === 'estimate') return typeof v.estimateId === 'string' ? { id: str(v.id) || uid(), type: 'estimate', estimateId: v.estimateId } : null
  // Item lines from earlier versions had quantity × price instead of an amount.
  const amount = 'amount' in v ? num(v.amount) : num(v.quantity) * num(v.price)
  return { id: str(v.id) || uid(), type: 'item', name: str(v.name), amount }
}

function normalizeInvoice(v: unknown): Invoice | null {
  if (!isObj(v) || typeof v.id !== 'string' || !Array.isArray(v.lines)) return null
  const now = new Date().toISOString()
  return {
    id: v.id,
    projectId: str(v.projectId),
    title: str(v.title),
    number: str(v.number),
    currency: str(v.currency, 'USD'),
    lines: v.lines.map(normalizeLine).filter((l): l is InvoiceLine => l !== null),
    createdAt: str(v.createdAt, now),
    updatedAt: str(v.updatedAt, now),
  }
}

const normalizeList = <T>(v: unknown, fn: (item: unknown) => T | null) =>
  (Array.isArray(v) ? v : []).map(fn).filter((x): x is T => x !== null)

/** Accepts the backup envelope (v1 — estimates only, v2 — with projects, v3 — with invoices) and a bare array of estimates. */
export async function readBackup(file: File): Promise<BackupData> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Файл повреждён или это не резервная копия смет.')
  }
  const envelope = isObj(data) && data.format === FORMAT ? data : null
  const list = Array.isArray(data) ? data : envelope?.estimates
  if (!Array.isArray(list)) throw new Error('Это не резервная копия смет.')
  return {
    projects: normalizeList(envelope?.projects, normalizeProject),
    estimates: normalizeList(list, normalizeEstimate),
    invoices: normalizeList(envelope?.invoices, normalizeInvoice),
  }
}
