import React from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  resetKey: number
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    resetKey: 0,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    toast.error('Ocorreu um erro inesperado. Tente novamente.')

    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary captured an error:', error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: prevState.resetKey + 1,
    }))
  }

  private handleResetApp = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleReport = async () => {
    if (typeof window === 'undefined') return

    const details = [
      'Materia Virtualis - Error Report',
      `Timestamp: ${new Date().toISOString()}`,
      `Message: ${this.state.error?.message || 'Unknown error'}`,
      this.state.error?.stack ? `Stack: ${this.state.error.stack}` : null,
      this.state.errorInfo?.componentStack
        ? `Component Stack: ${this.state.errorInfo.componentStack}`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(details)
      toast.success('Detalhes do erro copiados para a area de transferencia.')
    } catch {
      toast.error('Nao foi possivel copiar os detalhes do erro.')
    }
  }

  render() {
    if (this.state.hasError) {
      const showDetails = process.env.NODE_ENV === 'development'

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6 py-12">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Algo deu errado
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Encontramos um problema ao carregar esta tela. Voce pode tentar novamente ou reportar o erro.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={this.handleRetry}>
                Tentar Novamente
              </Button>
              <Button variant="outline" onClick={this.handleResetApp}>
                Resetar Aplicacao
              </Button>
              <Button variant="secondary" onClick={this.handleReport}>
                Reportar Erro
              </Button>
            </div>

            {showDetails && this.state.error && (
              <div className="mt-6">
                <details className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-700 dark:text-gray-300">
                  <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
                    Detalhes tecnicos (somente em desenvolvimento)
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-400">
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-400">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              </div>
            )}
          </div>
        </div>
      )
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
  }
}

export default ErrorBoundary
