import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

const toError = (value: unknown) => (value instanceof Error ? value : new Error(String(value)))

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: toError(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  // Render errors are caught by React; async ones (event handlers, promises) are caught here.
  componentDidMount() {
    window.addEventListener('error', this.handleWindowError)
    window.addEventListener('unhandledrejection', this.handleRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError)
    window.removeEventListener('unhandledrejection', this.handleRejection)
  }

  private handleWindowError = (e: ErrorEvent) => this.setState({ error: toError(e.error ?? e.message) })
  private handleRejection = (e: PromiseRejectionEvent) => this.setState({ error: toError(e.reason) })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
        <h1 className="text-[22px] font-semibold">Что-то пошло не так</h1>
        <p className="max-w-md text-label2">{error.message || 'Неизвестная ошибка'}</p>
        {error.stack && (
          <pre className="max-h-64 w-full max-w-md overflow-auto rounded-xl bg-card p-3 text-left text-[11px] whitespace-pre-wrap text-label3">
            {error.stack}
          </pre>
        )}
        <button
          type="button"
          onClick={() => location.reload()}
          className="h-11 rounded-full bg-tint px-6 text-[15px] font-semibold text-white active:opacity-70"
        >
          Перезагрузить
        </button>
      </div>
    )
  }
}
