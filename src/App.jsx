import React, { Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { api } from '@/api/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LogoProvider } from '@/lib/LogoContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import CapabilityGate from '@/components/layout/CapabilityGate';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { ALL_ROUTES, FirstTimeSetupComponent } from '@/lib/moduleRegistry';
import BrandMark from '@/components/shared/BrandMark';

// Shown once, while the session is being established. Route transitions do NOT
// use it — navigating between pages should never flash a spinner.
const BootSplash = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <BrandMark className="w-12 h-12 rounded-lg animate-pulse" />
  </div>
);

const Shell = ({ children }) =>
  FirstTimeSetupComponent ? <FirstTimeSetupComponent>{children}</FirstTimeSetupComponent> : children;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, authChecked, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <BootSplash />;
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  if (!isAuthenticated && (authChecked || authError?.type === 'auth_required')) {
    api.auth.redirectToLogin(window.location.href);
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Shell>
        <Routes>
          <Route element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
            {ALL_ROUTES.map(({ path, Component, moduleId, workspaceId }) => (
              <Route
                key={path}
                path={path}
                element={
                  // Settings is never gated: it is where the switches live, and
                  // closing it would leave no way to reopen anything.
                  moduleId && moduleId !== 'settings' ? (
                    <CapabilityGate moduleId={moduleId} workspaceId={workspaceId}>
                      <Component />
                    </CapabilityGate>
                  ) : (
                    <Component />
                  )
                }
              />
            ))}
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Shell>
    </Suspense>
  );
};

export default function App() {
  return (
    <LogoProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster dir="rtl" position="bottom-left" />
        </QueryClientProvider>
      </AuthProvider>
    </LogoProvider>
  );
}
