import { useCallback, useSyncExternalStore } from 'react'
import type { Estimate, EstimateRow } from './types'
import { DEFAULT_CURRENCY } from './types'

const DB_NAME = 'estimates'
const DB_VERSION = 1
const STORE = 'estimates'
/** Pre-IndexedDB storage; migrated once on first load and then removed. */
const LEGACY_LOCAL_STORAGE_KEY = 'estimates.v1'

interface State {
  ready: boolean
  estimates: Estimate[]
}

let state: State = { ready: false, estimates: [] }
const listeners = new Set<() => void>()

function setEstimates(estimates: Estimate[]) {
  state = { ready: true, estimates }
  listeners.forEach((l) => l())
}

// ---------- IndexedDB ----------

let dbPromise: Promise<IDBDatabase> | null = null

function openDb() {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void) {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T))
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

const dbGetAll = () => withStore<Estimate[]>('readonly', (s) => s.getAll())
const dbPutMany = (items: Estimate[]) => withStore('readwrite', (s) => items.forEach((e) => s.put(e)))
const dbDelete = (id: string) => withStore('readwrite', (s) => s.delete(id))

// ---------- Sync between tabs ----------

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('estimates') : null
channel?.addEventListener('message', () => void reload())

function persist(op: Promise<unknown>) {
  op.then(
    () => channel?.postMessage('changed'),
    (e: unknown) => alert('Не удалось сохранить данные в памяти браузера: ' + (e as Error)?.message),
  )
}

// ---------- Loading & migration ----------

async function migrateFromLocalStorage(): Promise<Estimate[]> {
  let legacy: Estimate[] = []
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) legacy = parsed as Estimate[]
  } catch {
    return []
  }
  if (legacy.length === 0) return []
  await dbPutMany(legacy)
  localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)
  return legacy
}

async function reload() {
  setEstimates(await dbGetAll())
}

let loading: Promise<void> | null = null

function ensureLoaded() {
  loading ??= (async () => {
    try {
      let all = await dbGetAll()
      if (all.length === 0) all = await migrateFromLocalStorage()
      setEstimates(all)
      // Ask the browser not to evict our data under storage pressure.
      void navigator.storage?.persist?.()
    } catch (e) {
      setEstimates([])
      alert('Не удалось открыть хранилище браузера (IndexedDB): ' + (e as Error)?.message)
    }
  })()
}

function subscribe(listener: () => void) {
  ensureLoaded()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

// ---------- Public API ----------

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const newRow = (): EstimateRow => ({ id: uid(), name: '', unit: 'шт', quantity: 1, price: 0 })

export interface ImportResult {
  added: number
  updated: number
  skipped: number
}

export function useEstimates() {
  const { ready, estimates } = useSyncExternalStore(subscribe, getSnapshot)

  const create = useCallback((currency: string = DEFAULT_CURRENCY): Estimate => {
    const now = new Date().toISOString()
    const estimate: Estimate = { id: uid(), title: '', currency, rows: [], createdAt: now, updatedAt: now }
    setEstimates([estimate, ...state.estimates])
    persist(dbPutMany([estimate]))
    return estimate
  }, [])

  const update = useCallback((estimate: Estimate) => {
    const updated = { ...estimate, updatedAt: new Date().toISOString() }
    setEstimates(state.estimates.map((e) => (e.id === estimate.id ? updated : e)))
    persist(dbPutMany([updated]))
  }, [])

  const remove = useCallback((id: string) => {
    setEstimates(state.estimates.filter((e) => e.id !== id))
    persist(dbDelete(id))
  }, [])

  const duplicate = useCallback((id: string): Estimate | undefined => {
    const source = state.estimates.find((e) => e.id === id)
    if (!source) return undefined
    const now = new Date().toISOString()
    const copy: Estimate = {
      ...source,
      id: uid(),
      title: source.title ? `${source.title} (копия)` : '',
      rows: source.rows.map((r) => ({ ...r, id: uid() })),
      createdAt: now,
      updatedAt: now,
    }
    setEstimates([copy, ...state.estimates])
    persist(dbPutMany([copy]))
    return copy
  }, [])

  /** Merges estimates by id: new ones are added, existing ones are replaced only if the imported copy is newer. */
  const importMany = useCallback((incoming: Estimate[]): ImportResult => {
    const byId = new Map(state.estimates.map((e) => [e.id, e]))
    const changed: Estimate[] = []
    const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
    for (const e of incoming) {
      const existing = byId.get(e.id)
      if (!existing) result.added++
      else if (e.updatedAt > existing.updatedAt) result.updated++
      else {
        result.skipped++
        continue
      }
      byId.set(e.id, e)
      changed.push(e)
    }
    if (changed.length) {
      setEstimates([...byId.values()])
      persist(dbPutMany(changed))
    }
    return result
  }, [])

  return { ready, estimates, create, update, remove, duplicate, importMany }
}
