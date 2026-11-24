import { useLayoutEffect } from 'react'
import { EstimateEditor } from './components/EstimateEditor'
import { EstimateList } from './components/EstimateList'
import { RowEditor } from './components/RowEditor'
import { UpdateBanner } from './components/UpdateBanner'
import { NavBar, BarButton } from './components/ui/NavBar'
import { ChevronLeft } from './components/ui/icons'
import { getLastNavigation, getSavedScroll, navigate, useRoute } from './lib/router'
import { useEstimates } from './lib/storage'

export default function App() {
  return (
    <>
      <Screens />
      <UpdateBanner />
    </>
  )
}

function Screens() {
  const route = useRoute()
  const { ready, estimates, create, update, remove, duplicate, importMany } = useEstimates()

  const routeKey = route.page === 'list' ? 'list' : route.page === 'edit' ? route.id : `${route.id}/${route.rowId ?? 'new'}`
  useLayoutEffect(() => {
    if (!ready) return
    window.scrollTo(0, getLastNavigation() === 'pop' ? (getSavedScroll() ?? 0) : 0)
  }, [routeKey, ready])

  const handleCreate = () => {
    const estimate = create()
    navigate({ page: 'edit', id: estimate.id })
  }

  if (!ready) return null

  if (route.page === 'edit' || route.page === 'row') {
    const current = estimates.find((e) => e.id === route.id)
    if (!current) {
      return (
        <>
          <NavBar
            left={
              <BarButton onClick={() => navigate({ page: 'list' })}>
                <ChevronLeft className="h-[17px] w-[10px]" />
                Сметы
              </BarButton>
            }
          />
          <p className="pt-24 text-center text-label2">Смета не найдена</p>
        </>
      )
    }
    if (route.page === 'row') {
      return <RowEditor key={routeKey} estimate={current} rowId={route.rowId} onChange={update} />
    }
    return (
      <EstimateEditor key={current.id} estimate={current} onChange={update} onDelete={remove} onDuplicate={duplicate} />
    )
  }

  return (
    <EstimateList estimates={estimates} onCreate={handleCreate} onDelete={remove} onDuplicate={duplicate} onImport={importMany} />
  )
}
