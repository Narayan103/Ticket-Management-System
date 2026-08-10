import './instrument'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import ErrorFallback from './components/ErrorFallback.tsx'
import { ThemeProvider } from './lib/theme-provider.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Sentry.ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
