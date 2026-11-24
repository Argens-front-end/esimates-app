import { Navigate, Outlet, ScrollRestoration, createHashRouter, useNavigate, useParams, useRouteError } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { EstimateEditor } from './components/EstimateEditor'
import { EstimateList } from './components/EstimateList'
import { InvoiceEditor } from './components/InvoiceEditor'
import { InvoiceItemEditor } from './components/InvoiceItemEditor'
import { ProjectEditor } from './components/ProjectEditor'
import { ProjectView } from './components/ProjectView'
import { RowEditor } from './components/RowEditor'
import { UpdateBanner } from './components/UpdateBanner'
import { NavBar, BarButton } from './components/ui/NavBar'
import { ChevronLeft } from './components/ui/icons'
import { Toast } from './components/ui/Toast'
import { NEW_ROW, paths, useGoBack } from './lib/router'
import { useEstimates } from './lib/storage'
import { enablePageTransitions } from './lib/pageTransitions'

// Hash history keeps routing working when the single-file build is opened from disk or as an installed PWA.
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <RethrowRouteError />,
    children: [
      { index: true, element: <ListScreen /> },
      { path: 'new-project', element: <ProjectFormScreen /> },
      { path: 'project/:id', element: <ProjectScreen /> },
      { path: 'project/:id/edit', element: <ProjectFormScreen /> },
      { path: 'estimate/:id', element: <EditScreen /> },
      { path: 'estimate/:id/row/:rowId', element: <RowScreen /> },
      { path: 'invoice/:id', element: <InvoiceScreen /> },
      { path: 'invoice/:id/line/:lineId', element: <InvoiceLineScreen /> },
      { path: '*', element: <Navigate to={paths.list()} replace /> },
    ],
  },
])
enablePageTransitions(router)

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

/** Hands route render errors to the app-wide ErrorBoundary instead of React Router's default error page. */
function RethrowRouteError(): never {
  throw useRouteError()
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
  const { projects, estimates, invoices, importMany, removeProject, clearAll } = useEstimates()
  return (
    <EstimateList
      projects={projects}
      estimates={estimates}
      invoices={invoices}
      onCreateProject={() => void navigate(paths.newProject())}
      onDeleteProject={removeProject}
      onImport={importMany}
      onClearAll={clearAll}
    />
  )
}

function ProjectScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { projects, estimates, invoices, create, remove, duplicate, removeProject, createInvoice, removeInvoice } =
    useEstimates()
  const project = projects.find((p) => p.id === id)
  if (!project) return <NotFound message="Объект не найден" />
  return (
    <ProjectView
      key={project.id}
      project={project}
      estimates={estimates.filter((e) => e.projectId === project.id)}
      invoices={invoices.filter((i) => i.projectId === project.id)}
      onDelete={removeProject}
      onCreateEstimate={() => void navigate(paths.estimate(create(project.id).id))}
      onDeleteEstimate={remove}
      onDuplicateEstimate={duplicate}
      onCreateInvoice={() => void navigate(paths.invoice(createInvoice(project.id).id))}
      onDeleteInvoice={removeInvoice}
    />
  )
}

/** Creates a project (`/new-project`) or edits an existing one (`/project/:id/edit`). */
function ProjectFormScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack()
  const { id } = useParams()
  const { projects, createProject, updateProject } = useEstimates()
  const project = id === undefined ? null : projects.find((p) => p.id === id)
  if (project === undefined) return <NotFound message="Объект не найден" />
  return (
    <ProjectEditor
      key={project?.id ?? 'new'}
      project={project}
      onSave={(title) => {
        if (project) {
          updateProject({ ...project, title })
          goBack(paths.project(project.id))
        } else {
          void navigate(paths.project(createProject(title).id), { replace: true })
        }
      }}
    />
  )
}

function useCurrentEstimate() {
  const { id } = useParams()
  return useEstimates().estimates.find((e) => e.id === id)
}

function EditScreen() {
  const { projects, update, remove, duplicate } = useEstimates()
  const current = useCurrentEstimate()
  if (!current) return <NotFound />
  return (
    <EstimateEditor
      key={current.id}
      estimate={current}
      projects={projects}
      onChange={update}
      onDelete={remove}
      onDuplicate={duplicate}
    />
  )
}

function RowScreen() {
  const { rowId = NEW_ROW } = useParams()
  const { update } = useEstimates()
  const current = useCurrentEstimate()
  if (!current) return <NotFound />
  return (
    <RowEditor
      key={`${current.id}/${rowId}`}
      rows={current.rows}
      currency={current.currency}
      rowId={rowId === NEW_ROW ? null : rowId}
      backPath={paths.estimate(current.id)}
      onChange={(rows) => update({ ...current, rows })}
    />
  )
}

function useCurrentInvoice() {
  const { id } = useParams()
  return useEstimates().invoices.find((i) => i.id === id)
}

function InvoiceScreen() {
  const { projects, estimates, updateInvoice, removeInvoice } = useEstimates()
  const invoice = useCurrentInvoice()
  if (!invoice) return <NotFound message="Инвойс не найден" />
  return (
    <InvoiceEditor
      key={invoice.id}
      invoice={invoice}
      project={projects.find((p) => p.id === invoice.projectId)}
      estimates={estimates.filter((e) => e.projectId === invoice.projectId)}
      onChange={updateInvoice}
      onDelete={removeInvoice}
    />
  )
}

function InvoiceLineScreen() {
  const { lineId = NEW_ROW } = useParams()
  const { updateInvoice } = useEstimates()
  const invoice = useCurrentInvoice()
  if (!invoice) return <NotFound message="Инвойс не найден" />
  return (
    <InvoiceItemEditor
      key={`${invoice.id}/${lineId}`}
      invoice={invoice}
      lineId={lineId === NEW_ROW ? null : lineId}
      onChange={updateInvoice}
    />
  )
}

function NotFound({ message = 'Смета не найдена' }: { message?: string }) {
  const navigate = useNavigate()
  return (
    <>
      <NavBar
        left={
          <BarButton onClick={() => void navigate(paths.list())}>
            <ChevronLeft className="h-[17px] w-[10px]" />
            Объекты
          </BarButton>
        }
      />
      <p className="pt-24 text-center text-label2">{message}</p>
    </>
  )
}
