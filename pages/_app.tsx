import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const originalWarn = console.warn
    const originalError = console.error
    const ignoredSubstring = 'Unable to add filesystem: <illegal path>'

    const shouldIgnore = (args: unknown[]) =>
      args.some(arg => typeof arg === 'string' && arg.includes(ignoredSubstring))

    console.warn = (...args) => {
      if (shouldIgnore(args)) return
      originalWarn(...args)
    }

    console.error = (...args) => {
      if (shouldIgnore(args)) return
      originalError(...args)
    }

    return () => {
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  // Register service worker for caching static assets in production
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <NotificationProvider>
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
