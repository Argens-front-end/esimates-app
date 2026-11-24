import type { Estimate, EstimateRow, Project } from './types'
import { saveFile } from './saveFile'
import { uid } from './storage'

const FORMAT = 'smety-backup'
const VERSION = 2

export interface BackupData {
  projects: Project[]
  estimates: Estimate[]
}

export async function exportBackup({ projects, estimates }: BackupData) {
  const payload = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), projects, estimates }
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

/** Accepts the backup envelope (v1 without projects or v2) and a bare array of estimates. */
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
  const projects = (Array.isArray(envelope?.projects) ? envelope.projects : [])
    .map(normalizeProject)
    .filter((p): p is Project => p !== null)
  const estimates = list.map(normalizeEstimate).filter((e): e is Estimate => e !== null)
  return { projects, estimates }
}
