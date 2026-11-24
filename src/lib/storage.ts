import { useCallback, useSyncExternalStore } from 'react'
import type { Estimate, EstimateRow } from './types'
import { DEFAULT_CURRENCY } from './types'

/**
 * Active storage backend. Switch to 'indexedDB' or 'localStorage' here.
 * On first load, if the active backend is empty, data is migrated from the other one.
 */
const STORAGE_BACKEND = 'localStorage' as StorageBackendKind

type StorageBackendKind = 'indexedDB' | 'localStorage'

interface StorageBackend {
  name: string
  getAll(): Promise<Estimate[]>
  putMany(items: Estimate[]): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

const DB_NAME = 'estimates'
const DB_VERSION = 1
const STORE = 'estimates'
const LOCAL_STORAGE_KEY = 'estimates.v1'

interface State {
  ready: boolean
  estimates: Estimate[]
  storageError: string | null
}

let state: State = { ready: false, estimates: [], storageError: null }
const listeners = new Set<() => void>()

function setEstimates(estimates: Estimate[]) {
  state = { ...state, ready: true, estimates }
  listeners.forEach((l) => l())
}

function setStorageError(storageError: string | null) {
  state = { ...state, storageError }
  listeners.forEach((l) => l())
}

// ---------- IndexedDB backend ----------

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

const indexedDbBackend: StorageBackend = {
  name: 'IndexedDB',
  getAll: () => withStore<Estimate[]>('readonly', (s) => s.getAll()),
  putMany: async (items) => {
    await withStore('readwrite', (s) => items.forEach((e) => s.put(e)))
  },
  delete: async (id) => {
    await withStore('readwrite', (s) => s.delete(id))
  },
  clear: async () => {
    await withStore('readwrite', (s) => s.clear())
  },
}

// ---------- localStorage backend ----------

function lsRead(): Estimate[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
  const parsed: unknown = raw ? JSON.parse(raw) : []
  return Array.isArray(parsed) ? (parsed as Estimate[]) : []
}

function lsWrite(items: Estimate[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
}

const localStorageBackend: StorageBackend = {
  name: 'localStorage',
  getAll: async () => lsRead(),
  putMany: async (items) => {
    const byId = new Map(lsRead().map((e) => [e.id, e]))
    items.forEach((e) => byId.set(e.id, e))
    lsWrite([...byId.values()])
  },
  delete: async (id) => {
    lsWrite(lsRead().filter((e) => e.id !== id))
  },
  clear: async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  },
}

const backends: Record<StorageBackendKind, StorageBackend> = {
  indexedDB: indexedDbBackend,
  localStorage: localStorageBackend,
}
const backend = backends[STORAGE_BACKEND]
const otherBackend = backends[STORAGE_BACKEND === 'indexedDB' ? 'localStorage' : 'indexedDB']

// ---------- Sync between tabs ----------

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('estimates') : null
channel?.addEventListener('message', () => void reload())

function persist(op: Promise<unknown>) {
  op.then(
    () => channel?.postMessage('changed'),
    (e: unknown) => setStorageError(`Не удалось сохранить: ${(e as Error)?.message ?? String(e)}`),
  )
}

// ---------- Loading & migration ----------

async function migrateFromOtherBackend(): Promise<Estimate[]> {
  let other: Estimate[] = []
  try {
    other = await otherBackend.getAll()
  } catch {
    return []
  }
  if (other.length === 0) return []
  await backend.putMany(other)
  await otherBackend.clear().catch(() => undefined)
  return other
}

const loadErrorMessage = (e: unknown) => `Не удалось загрузить сметы (${backend.name}): ${(e as Error)?.message ?? String(e)}`

async function reload() {
  try {
    setEstimates(await backend.getAll())
  } catch (e) {
    setStorageError(loadErrorMessage(e))
  }
}

let loading: Promise<void> | null = null

function ensureLoaded() {
  loading ??= (async () => {
    try {
      let all = await backend.getAll()
      if (all.length === 0) all = await migrateFromOtherBackend()
      setEstimates(all)
      // Ask the browser not to evict our data under storage pressure.
      void navigator.storage?.persist?.()
    } catch (e) {
      setEstimates([])
      setStorageError(loadErrorMessage(e))
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
  const { ready, estimates, storageError } = useSyncExternalStore(subscribe, getSnapshot)
  const create = useCallback((currency: string = DEFAULT_CURRENCY): Estimate => {
    const now = new Date().toISOString()
    const estimate: Estimate = { id: uid(), title: '', currency, rows: [], createdAt: now, updatedAt: now }
    setEstimates([estimate, ...state.estimates])
    persist(backend.putMany([estimate]))
    return estimate
  }, [])

  const update = useCallback((estimate: Estimate) => {
    const updated = { ...estimate, updatedAt: new Date().toISOString() }
    setEstimates(state.estimates.map((e) => (e.id === estimate.id ? updated : e)))
    persist(backend.putMany([updated]))
  }, [])

  const remove = useCallback((id: string) => {
    setEstimates(state.estimates.filter((e) => e.id !== id))
    persist(backend.delete(id))
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
    persist(backend.putMany([copy]))
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
      persist(backend.putMany(changed))
    }
    return result
  }, [])

  const clearStorageError = useCallback(() => setStorageError(null), [])

  return { ready, estimates, storageError, clearStorageError, create, update, remove, duplicate, importMany }
}
