import { useState } from 'react'
import type { Project } from '../lib/types'
import { paths, useGoBack } from '../lib/router'
import { BarButton, NavBar } from './ui/NavBar'
import { Cell, Group } from './ui/Group'

interface Props {
  /** `null` creates a new project. */
  project: Project | null
  onSave: (title: string) => void
}

/** Full-screen form for creating a project or editing its details. */
export function ProjectEditor({ project, onSave }: Props) {
  const isNew = project === null
  const [title, setTitle] = useState(project?.title ?? '')
  const canSave = title.trim().length > 0
  const goBack = useGoBack()

  const save = () => {
    if (canSave) onSave(title.trim())
  }

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <NavBar
        title={isNew ? 'Новый объект' : 'Объект'}
        left={<BarButton onClick={() => goBack(project ? paths.project(project.id) : paths.list())}>Отменить</BarButton>}
        right={
          <BarButton bold disabled={!canSave} onClick={save}>
            {isNew ? 'Создать' : 'Готово'}
          </BarButton>
        }
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Group header="Название">
          <label className="block">
            <Cell>
              <input
                autoFocus
                value={title}
                placeholder="Например, Дом на Ленина"
                enterKeyHint="done"
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-w-0 bg-transparent text-[17px] outline-none"
              />
            </Cell>
          </label>
        </Group>
        <button type="submit" hidden />
      </form>
    </div>
  )
}
