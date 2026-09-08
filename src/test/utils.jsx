import React from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/AuthContext'

export function renderWithProviders(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const { route = '/', ...renderOptions } = options

  function Wrapper({ children }) {
    return (
      <LanguageProvider>
        <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}