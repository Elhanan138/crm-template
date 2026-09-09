import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MotionPage } from '@/components/shared/motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AccessDenied from './AccessDenied';
import AnnouncementPopupModal from './AnnouncementPopupModal';
import { Suspense } from 'react';
import { optionalComponent } from '@/lib/optionalComponent';
import { prefetchAllRoutes } from '@/lib/moduleRegistry';
import { useCapability } from '@/hooks/useCapability';

// Compiled out entirely when the agent feature is not part of the build.
const SystemAssistantSheet = optionalComponent('agent', 'src/components/shared/SystemAssistantSheet.jsx');
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuth } from '@/lib/AuthContext';
import { clearNavStack, handleRouteChange, consumePendingScroll } from '@/hooks/useSmartBack';
import { api } from '@/api/client';
import { WideLayoutProvider, useIsWide } from '@/lib/WideLayoutContext';

function AppLayoutInner() {
  const announcementsEnabled = useCapability('announcements');
  const agentEnabled = useCapability('blossom_agent', 'agent');
  const wide = useIsWide();
  const [collapsed, setCollapsed] = useState(false);
  const { isAllowed, isLoading, currentUser, effectiveUser, isRealAdmin } = useAccessControl();
  const { navigateToLogin } = useAuth();

  const location = useLocation();
  const scrollRef = useRef(0);
  const prevPathRef = useRef(location.pathname);
  const mountedRef = useRef(false);

  // Track scroll position for back-navigation restore

  // Warm every route chunk once the app is idle, so navigation never waits on a
  // network round-trip. Hovering a nav link warms that route immediately.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => prefetchAllRoutes());
    return () => cancel(handle);
  }, []);

  useEffect(() => {
    const onScroll = () => { scrollRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Clear nav stack on mount — fresh session after load/refresh
  useEffect(() => {
    clearNavStack();
    mountedRef.current = true;
  }, []);

  // Process route change DURING render so children (BackButton) see the updated stack
  const currentPath = location.pathname;
  if (mountedRef.current && currentPath !== prevPathRef.current) {
    handleRouteChange(prevPathRef.current, currentPath, scrollRef.current);
    prevPathRef.current = currentPath;
  }

  // Restore scroll position after paint when navigating back
  useLayoutEffect(() => {
    const scrollY = consumePendingScroll();
    if (scrollY != null) {
      requestAnimationFrame(() => {
        setTimeout(() => window.scrollTo(0, scrollY), 50);
      });
    }
  }, [location.pathname]);

  // No logged-in user at all → send to login, never show "access denied"
  const needsLogin = !isLoading && !currentUser;
  useEffect(() => {
    if (needsLogin) navigateToLogin();
  }, [needsLogin]);

  // Silent heartbeat — triggers alert + reminder processing on mount, every 5 min,
  // and when the tab becomes visible again. The backend throttle (alerts_heartbeat_config)
  // decides what actually runs; the client just fires the trigger.
  // No business-hours gate on the client — reminders must fire at any hour.
  useEffect(() => {
    if (needsLogin || isLoading) return;
    const runHeartbeat = () => {
      if (document.visibilityState !== 'visible') return;
      api.functions.invoke('runAlertsIfDue', {}).catch(() => {});
    };
    runHeartbeat();
    const interval = setInterval(runHeartbeat, 5 * 60 * 1000);
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') runHeartbeat(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [needsLogin, isLoading]);

  if (needsLogin) return null;

  if (!isLoading && !isAllowed) {
    return <AccessDenied currentUser={currentUser} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className={`min-h-screen pt-16 md:pt-0 transition-all duration-300 ${collapsed ? 'md:ms-16' : 'md:ms-[174px]'}`}>
        <TopBar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className={`mx-auto py-6 md:py-8 ${wide ? 'max-w-none px-3 md:px-4' : 'max-w-[1600px] px-4 md:px-8'}`}>
          <MotionPage key={location.pathname}>
            <Outlet />
          </MotionPage>
        </div>
      </main>
      {announcementsEnabled && <AnnouncementPopupModal />}
      {agentEnabled && SystemAssistantSheet && (
        <Suspense fallback={null}><SystemAssistantSheet /></Suspense>
      )}
    </div>
  );
}

export default function AppLayout() {
  return (
    <WideLayoutProvider>
      <AppLayoutInner />
    </WideLayoutProvider>
  );
}