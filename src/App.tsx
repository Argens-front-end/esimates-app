import { Navigate, Outlet, ScrollRestoration, createHashRouter, useNavigate, useParams } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { EstimateEditor } from './components/EstimateEditor'
import { EstimateList } from './components/EstimateList'
import { RowEditor } from './components/RowEditor'
import { UpdateBanner } from './components/UpdateBanner'
import { NavBar, BarButton } from './components/ui/NavBar'
import { ChevronLeft } from './components/ui/icons'
import { Toast } from './components/ui/Toast'
import { NEW_ROW, paths } from './lib/router'
import { useEstimates } from './lib/storage'

// Hash history keeps routing working when the single-file build is opened from disk or as an installed PWA.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <ListScreen /> },
      { path: 'estimate/:id', element: <EditScreen /> },
      { path: 'estimate/:id/row/:rowId', element: <RowScreen /> },
      { path: '*', element: <Navigate to={paths.list()} replace /> },
    ],
  },
])

export default function App() {
  const { ready } = useEstimates()
  return (
    <>
      {ready && <RouterProvider router={router} />}
      <UpdateBanner />
      <StorageErrorToast />
    </>
  )
}

function StorageErrorToast() {
  const { storageError, clearStorageError } = useEstimates()
  return <Toast message={storageError} onHide={clearStorageError} />
}

function Layout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}

function ListScreen() {
  const navigate = useNavigate()
  const { estimates, create, remove, duplicate, importMany } = useEstimates()
  const handleCreate = () => void navigate(paths.estimate(create().id))
  return (
    <EstimateList estimates={estimates} onCreate={handleCreate} onDelete={remove} onDuplicate={duplicate} onImport={importMany} />
  )
}

function useCurrentEstimate() {
  const { id } = useParams()
  return useEstimates().estimates.find((e) => e.id === id)
}

function EditScreen() {
  const { update, remove, duplicate } = useEstimates()
  const current = useCurrentEstimate()
  if (!current) return <NotFound />
  return <EstimateEditor key={current.id} estimate={current} onChange={update} onDelete={remove} onDuplicate={duplicate} />
}

function RowScreen() {
  const { rowId = NEW_ROW } = useParams()
  const { update } = useEstimates()
  const current = useCurrentEstimate()
  if (!current) return <NotFound />
  return (
    <RowEditor key={`${current.id}/${rowId}`} estimate={current} rowId={rowId === NEW_ROW ? null : rowId} onChange={update} />
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <>
      <NavBar
        left={
          <BarButton onClick={() => void navigate(paths.list())}>
            <ChevronLeft className="h-[17px] w-[10px]" />
            Сметы
          </BarButton>
        }
      />
      <p className="pt-24 text-center text-label2">Смета не найдена</p>
    </>
  )
}
