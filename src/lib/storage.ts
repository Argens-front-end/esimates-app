import { useCallback, useSyncExternalStore } from 'react'
import type { BackupData } from './backup'
import type { Estimate, EstimateRow, Invoice, Project } from './types'
import { DEFAULT_CURRENCY } from './types'
import { upgradeInvoice } from './invoice'

/**
 * Active storage backend. Switch to 'indexedDB' or 'localStorage' here.
 * On first load, if the active backend is empty, data is migrated from the other one.
 */
const STORAGE_BACKEND = 'localStorage' as StorageBackendKind

type StorageBackendKind = 'indexedDB' | 'localStorage'

interface Collections {
  estimates: Estimate
  projects: Project
  invoices: Invoice
}

type CollectionName = keyof Collections

const COLLECTIONS: CollectionName[] = ['estimates', 'projects', 'invoices']

interface StorageBackend {
  name: string
  getAll<C extends CollectionName>(collection: C): Promise<Collections[C][]>
  putMany<C extends CollectionName>(collection: C, items: Collections[C][]): Promise<void>
  delete(collection: CollectionName, ids: string[]): Promise<void>
  clear(collection: CollectionName): Promise<void>
}

const DB_NAME = 'estimates'
const DB_VERSION = 3
const LOCAL_STORAGE_KEYS: Record<CollectionName, string> = {
  estimates: 'estimates.v1',
  projects: 'projects.v1',
  invoices: 'invoices.v1',
}

interface State {
  ready: boolean
  estimates: Estimate[]
  projects: Project[]
  invoices: Invoice[]
  storageError: string | null
}

type Data = Pick<State, 'estimates' | 'projects' | 'invoices'>

const EMPTY: Data = { estimates: [], projects: [], invoices: [] }

let state: State = { ready: false, ...EMPTY, storageError: null }
const listeners = new Set<() => void>()

function setData(data: Partial<Data>) {
  state = { ...state, ...data, ready: true }
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
      for (const name of COLLECTIONS) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function withStore<T>(
  collection: CollectionName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(collection, mode)
    const req = fn(tx.objectStore(collection))
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T))
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

const indexedDbBackend: StorageBackend = {
  name: 'IndexedDB',
  getAll: (collection) => withStore(collection, 'readonly', (s) => s.getAll()),
  putMany: async (collection, items) => {
    await withStore(collection, 'readwrite', (s) => items.forEach((e) => s.put(e)))
  },
  delete: async (collection, ids) => {
    await withStore(collection, 'readwrite', (s) => ids.forEach((id) => s.delete(id)))
  },
  clear: async (collection) => {
    await withStore(collection, 'readwrite', (s) => s.clear())
  },
}

// ---------- localStorage backend ----------

function lsRead<C extends CollectionName>(collection: C): Collections[C][] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS[collection])
  const parsed: unknown = raw ? JSON.parse(raw) : []
  return Array.isArray(parsed) ? (parsed as Collections[C][]) : []
}

function lsWrite(collection: CollectionName, items: { id: string }[]) {
  localStorage.setItem(LOCAL_STORAGE_KEYS[collection], JSON.stringify(items))
}

const localStorageBackend: StorageBackend = {
  name: 'localStorage',
  getAll: async (collection) => lsRead(collection),
  putMany: async (collection, items) => {
    const byId = new Map<string, { id: string }>(lsRead(collection).map((e) => [e.id, e]))
    items.forEach((e) => byId.set(e.id, e))
    lsWrite(collection, [...byId.values()])
  },
  delete: async (collection, ids) => {
    const drop = new Set(ids)
    lsWrite(collection, lsRead(collection).filter((e) => !drop.has(e.id)))
  },
  clear: async (collection) => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS[collection])
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

const FALLBACK_PROJECT_TITLE = 'Прочие сметы'

/**
 * Every estimate and invoice must belong to a project. Older data has no `projectId` and imported records may
 * point to a missing project — such records are moved into the "Прочие сметы" project (created if needed).
 * Returns the normalized data plus the records that changed and must be persisted.
 */
function normalize({ estimates, projects, invoices }: Data) {
  const all = [...projects]
  const known = new Set(all.map((p) => p.id))
  const isOrphan = (r: { projectId: string }) => !r.projectId || !known.has(r.projectId)
  const orphanEstimates = estimates.filter(isOrphan)
  const orphanInvoices = invoices.filter(isOrphan)
  const changedProjects: Project[] = []
  if (orphanEstimates.length === 0 && orphanInvoices.length === 0) {
    return { data: { estimates, projects: all, invoices }, changedEstimates: [], changedInvoices: [], changedProjects }
  }

  const now = new Date().toISOString()
  let fallback = all.find((p) => p.title === FALLBACK_PROJECT_TITLE)
  if (!fallback) {
    fallback = { id: uid(), title: FALLBACK_PROJECT_TITLE, createdAt: now, updatedAt: now }
    all.push(fallback)
    changedProjects.push(fallback)
  }
  const projectId = fallback.id
  const movedEstimates = new Map(orphanEstimates.map((e) => [e.id, { ...e, projectId }]))
  const movedInvoices = new Map(orphanInvoices.map((i) => [i.id, { ...i, projectId }]))
  return {
    data: {
      estimates: estimates.map((e) => movedEstimates.get(e.id) ?? e),
      projects: all,
      invoices: invoices.map((i) => movedInvoices.get(i.id) ?? i),
    },
    changedEstimates: [...movedEstimates.values()],
    changedInvoices: [...movedInvoices.values()],
    changedProjects,
  }
}

/** Applies normalized data to the state and persists the records `normalize` had to fix. */
function applyNormalized(data: Data) {
  const n = normalize(data)
  setData(n.data)
  if (n.changedProjects.length) persist(backend.putMany('projects', n.changedProjects))
  if (n.changedEstimates.length) persist(backend.putMany('estimates', n.changedEstimates))
  if (n.changedInvoices.length) persist(backend.putMany('invoices', n.changedInvoices))
}

async function loadAll(from: StorageBackend): Promise<Data> {
  const [estimates, projects, invoices] = await Promise.all([
    from.getAll('estimates'),
    from.getAll('projects'),
    from.getAll('invoices'),
  ])
  return { estimates, projects, invoices: invoices.map(upgradeInvoice) }
}

const isEmptyData = (d: Data) => d.estimates.length === 0 && d.projects.length === 0 && d.invoices.length === 0

async function migrateFromOtherBackend() {
  let other: Data
  try {
    other = await loadAll(otherBackend)
  } catch {
    return null
  }
  if (isEmptyData(other)) return null
  await backend.putMany('estimates', other.estimates)
  await backend.putMany('projects', other.projects)
  await backend.putMany('invoices', other.invoices)
  await Promise.all(COLLECTIONS.map((c) => otherBackend.clear(c))).catch(() => undefined)
  return other
}

const loadErrorMessage = (e: unknown) => `Не удалось загрузить сметы (${backend.name}): ${(e as Error)?.message ?? String(e)}`

async function reload() {
  try {
    applyNormalized(await loadAll(backend))
  } catch (e) {
    setStorageError(loadErrorMessage(e))
  }
}

let loading: Promise<void> | null = null

function ensureLoaded() {
  loading ??= (async () => {
    try {
      let all = await loadAll(backend)
      if (isEmptyData(all)) all = (await migrateFromOtherBackend()) ?? all
      applyNormalized(all)
      // Ask the browser not to evict our data under storage pressure.
      void navigator.storage?.persist?.()
    } catch (e) {
      setData(EMPTY)
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

/** Next free numeric invoice number within a project ("1", "2", …). */
function nextInvoiceNumber(projectId: string) {
  const used = state.invoices.filter((i) => i.projectId === projectId).map((i) => Number.parseInt(i.number, 10) || 0)
  return String(Math.max(0, ...used) + 1)
}

/** Currency of the project's most recently edited estimate, so item lines match the linked estimates. */
function projectCurrency(projectId: string) {
  const latest = state.estimates
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  return latest?.currency ?? DEFAULT_CURRENCY
}

export interface ImportResult {
  added: number
  updated: number
  skipped: number
}

/** Merges items by id: new ones are added, existing ones are replaced only if the imported copy is newer. */
function mergeById<T extends { id: string; updatedAt: string }>(current: T[], incoming: T[], result: ImportResult) {
  const byId = new Map(current.map((e) => [e.id, e]))
  const changed: T[] = []
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
  return { all: [...byId.values()], changed }
}

export function useEstimates() {
  const { ready, estimates, projects, invoices, storageError } = useSyncExternalStore(subscribe, getSnapshot)

  const create = useCallback((projectId: string, currency: string = DEFAULT_CURRENCY): Estimate => {
    const now = new Date().toISOString()
    const estimate: Estimate = { id: uid(), projectId, title: '', currency, rows: [], createdAt: now, updatedAt: now }
    setData({ estimates: [estimate, ...state.estimates] })
    persist(backend.putMany('estimates', [estimate]))
    return estimate
  }, [])

  const update = useCallback((estimate: Estimate) => {
    const updated = { ...estimate, updatedAt: new Date().toISOString() }
    setData({ estimates: state.estimates.map((e) => (e.id === estimate.id ? updated : e)) })
    persist(backend.putMany('estimates', [updated]))
  }, [])

  const remove = useCallback((id: string) => {
    setData({ estimates: state.estimates.filter((e) => e.id !== id) })
    persist(backend.delete('estimates', [id]))
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
    setData({ estimates: [copy, ...state.estimates] })
    persist(backend.putMany('estimates', [copy]))
    return copy
  }, [])

  const createProject = useCallback((title: string): Project => {
    const now = new Date().toISOString()
    const project: Project = { id: uid(), title, createdAt: now, updatedAt: now }
    setData({ projects: [project, ...state.projects] })
    persist(backend.putMany('projects', [project]))
    return project
  }, [])

  const updateProject = useCallback((project: Project) => {
    const updated = { ...project, updatedAt: new Date().toISOString() }
    setData({ projects: state.projects.map((p) => (p.id === project.id ? updated : p)) })
    persist(backend.putMany('projects', [updated]))
  }, [])

  /** Removes a project together with all of its estimates and invoices. */
  const removeProject = useCallback((id: string) => {
    const estimateIds = state.estimates.filter((e) => e.projectId === id).map((e) => e.id)
    const invoiceIds = state.invoices.filter((i) => i.projectId === id).map((i) => i.id)
    setData({
      projects: state.projects.filter((p) => p.id !== id),
      estimates: state.estimates.filter((e) => e.projectId !== id),
      invoices: state.invoices.filter((i) => i.projectId !== id),
    })
    persist(
      Promise.all([
        backend.delete('projects', [id]),
        backend.delete('estimates', estimateIds),
        backend.delete('invoices', invoiceIds),
      ]),
    )
  }, [])

  const createInvoice = useCallback((projectId: string): Invoice => {
    const now = new Date().toISOString()
    const invoice: Invoice = {
      id: uid(),
      projectId,
      title: '',
      number: nextInvoiceNumber(projectId),
      currency: projectCurrency(projectId),
      lines: [],
      createdAt: now,
      updatedAt: now,
    }
    setData({ invoices: [invoice, ...state.invoices] })
    persist(backend.putMany('invoices', [invoice]))
    return invoice
  }, [])

  const updateInvoice = useCallback((invoice: Invoice) => {
    const updated = { ...invoice, updatedAt: new Date().toISOString() }
    setData({ invoices: state.invoices.map((i) => (i.id === invoice.id ? updated : i)) })
    persist(backend.putMany('invoices', [updated]))
  }, [])

  const removeInvoice = useCallback((id: string) => {
    setData({ invoices: state.invoices.filter((i) => i.id !== id) })
    persist(backend.delete('invoices', [id]))
  }, [])

  const importMany = useCallback((incoming: BackupData): ImportResult => {
    const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
    const projectsMerge = mergeById(state.projects, incoming.projects, { added: 0, updated: 0, skipped: 0 })
    const estimatesMerge = mergeById(state.estimates, incoming.estimates, result)
    const invoicesMerge = mergeById(state.invoices, incoming.invoices, result)
    // Persist merged records before normalization so orphan fixes (saved by applyNormalized) win.
    if (projectsMerge.changed.length) persist(backend.putMany('projects', projectsMerge.changed))
    if (estimatesMerge.changed.length) persist(backend.putMany('estimates', estimatesMerge.changed))
    if (invoicesMerge.changed.length) persist(backend.putMany('invoices', invoicesMerge.changed))
    applyNormalized({ estimates: estimatesMerge.all, projects: projectsMerge.all, invoices: invoicesMerge.all })
    return result
  }, [])

  const clearAll = useCallback(() => {
    setData(EMPTY)
    persist(Promise.all(COLLECTIONS.map((c) => backend.clear(c))))
  }, [])

  const clearStorageError = useCallback(() => setStorageError(null), [])

  return {
    ready,
    estimates,
    projects,
    invoices,
    storageError,
    clearStorageError,
    create,
    update,
    remove,
    duplicate,
    importMany,
    createProject,
    updateProject,
    removeProject,
    createInvoice,
    updateInvoice,
    removeInvoice,
    clearAll,
  }
}
