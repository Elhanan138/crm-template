import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExitIcon, HamburgerMenuIcon, Cross2Icon, ChevronRightIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from './NotificationBell';
import SidebarNav from './SidebarNav';
import { isAdminUser, cleanEmail } from '@/lib/permissions';
import { getDisplayName } from '@/lib/displayName';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useIsMobile } from '@/hooks/use-mobile';
import { NAV_ITEMS as navItems } from '@/lib/navItems';
import { useLogo } from '@/lib/LogoContext';
import BrandMark from '@/components/shared/BrandMark';
import { APP_IDENTITY } from '@/lib/appIdentity';
import { isFeatureEnabled } from '@/lib/features';

const AGENT_LABEL = APP_IDENTITY.name ? `${APP_IDENTITY.name} Agent` : 'עוזר חכם';

export default function Sidebar({ collapsed, onToggle }) {
 const location = useLocation();
 const [mobileOpen, setMobileOpen] = useState(false);
 const { systemName, systemSubtitle } = useLogo();
 const isMobile = useIsMobile();

 const { data: user } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => api.auth.me(),
 });

 const isRealAdmin = isAdminUser(user);

 const { data: teamMembers = [] } = useQuery({
  queryKey: ['teamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
  enabled: !!user,
 });

 const { hasAnyProjectAccess } = useAccessControl();

 const { data: sysFeaturesRes } = useQuery({
  queryKey: ['global-system-features'],
  queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'global_system_features' }),
  staleTime: 60000,
 });
 const sysFeatures = sysFeaturesRes?.data?.value || {};
 const blossomAgentAccess = sysFeatures.blossom_agent || 'all';
 // The agent must also be part of THIS build. Without the compile-time check the
 // button kept appearing in bundles exported without the agent.
 const blossomAgentEnabled =
  isFeatureEnabled('agent') &&
  (blossomAgentAccess === 'all' || (blossomAgentAccess === 'admin' && isRealAdmin));

 const allowedByFeature = (key) => {
  const accessLevel = key && sysFeatures[key];
  if (!accessLevel) return null;
  if (accessLevel === 'closed') return false;
  if (accessLevel === 'admin') return isRealAdmin;
  return true;
 };

 const visibleNavItems = navItems.filter(item => {
  if (item.alwaysVisible) return true;
  const allowed = allowedByFeature(item.featureKey || item.path.replace('/', ''));
  if (allowed !== null) return allowed;
  if (item.adminOnly && !isRealAdmin) return false;
  if (item.requiresProjectAccess && !isRealAdmin && !hasAnyProjectAccess) return false;

  return true;
 }).map(item => (
  // Sub-pages obey the same switches as everything else.
  item.children?.length
   ? { ...item, children: item.children.filter(c => allowedByFeature(c.featureKey) !== false) }
   : item
 )).filter(item => !item.workspace || item.children.length > 0);

 // Split: core+operations go in the scrollable nav; system items (Settings) go in the footer
 const navGroupItems = visibleNavItems.filter(i => i.group !== 'system');
 const systemItems = visibleNavItems.filter(i => i.group === 'system');

 const ownMember = teamMembers.find(m => cleanEmail(m.email) === cleanEmail(user?.email));
 const displayName = getDisplayName(user, ownMember);
 const avatarUrl = user?.profile_image_url;

 const closeMobile = () => setMobileOpen(false);

 // Close on any navigation — a tapped link, the back button, or a programmatic
 // redirect. Relying on the link's own onClick left the scrim stranded over the
 // page whenever navigation happened by any other route.
 useEffect(() => { setMobileOpen(false); }, [location.pathname]);

 // Lock the page behind the drawer, and always restore it. A lock that outlives
 // the drawer reads as a frozen screen.
 useEffect(() => {
  if (!isMobile || !mobileOpen) return undefined;
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = previous; };
 }, [isMobile, mobileOpen]);

 const renderItemLink = (item, isCollapsed) => {
  const Icon = item.icon;
  const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
  return (
   <Link
    key={item.path}
    to={item.path}
    onClick={closeMobile}
    title={isCollapsed ? item.label : undefined}
    className={`relative flex items-center gap-3 rounded-xl text-sm transition-all duration-150 ${
     isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
    } ${
     active
      ? 'bg-primary/8 text-primary font-semibold'
      : 'text-foreground/70 font-medium hover:bg-muted/70 hover:text-foreground'
    }`}
   >
    {active && (
     <span className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-e-full bg-primary"/>
    )}
    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
    {!isCollapsed && <span>{item.label}</span>}
   </Link>
  );
 };

 const SidebarContent = ({ isCollapsed = false }) => (
  <div className="flex flex-col h-full">
   {/* Logo section with integrated collapse toggle */}
   <div className={`py-4 border-b border-sidebar-border ${isCollapsed ? 'px-2' : 'px-4'}`}>
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
     {/* Mobile close button */}
     {!isCollapsed && (
      <button
       onClick={closeMobile}
       aria-label="סגירת תפריט"
       className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
      >
       <Cross2Icon className="w-4 h-4 text-muted-foreground"/>
      </button>
     )}

     {/* When collapsed — the logo image IS the expand trigger (desktop) */}
     {isCollapsed ? (
      <button
       onClick={onToggle}
       title="הרחב תפריט"
       className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all"
      >
       <BrandMark alt="הרחב תפריט" className="w-full h-full rounded-lg"/>
      </button>
     ) : (
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
       <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
        <BrandMark className="w-full h-full rounded-lg"/>
       </div>
       <div className="text-right min-w-0">
        <div className="text-base font-bold text-primary tracking-tight leading-none">{systemName}</div>
        {systemSubtitle && (
          <p className="text-[9px] text-muted-foreground font-medium tracking-widest uppercase mt-0.5">{systemSubtitle}</p>
        )}
       </div>
      </div>
     )}

     {/* Collapse toggle — desktop only, only when expanded */}
     {!isCollapsed && (
      <button
       onClick={onToggle}
       title="כווץ תפריט"
       aria-label="כווץ תפריט"
       className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
      >
       <ChevronRightIcon className="w-4 h-4"/>
      </button>
     )}
    </div>
   </div>

   {/* Navigation — core + operations with separator */}
   <SidebarNav items={navGroupItems} isCollapsed={isCollapsed} onNavigate={closeMobile} />

   {/* Footer — system items + logout pinned to bottom */}
   <div className={`mt-auto py-3 border-t border-sidebar-border space-y-0.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
    {/* System items (Settings) */}
    {systemItems.map(item => renderItemLink(item, isCollapsed))}

    {/* Logout — destructive color from design system */}
    <button
     onClick={() => { api.auth.logout(); closeMobile(); }}
     title={isCollapsed ? 'התנתקות' : undefined}
     className={`flex items-center gap-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/8 transition-all duration-150 w-full ${
      isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
     }`}
    >
     <ExitIcon className="w-[18px] h-[18px] flex-shrink-0"/>
     {!isCollapsed && <span>התנתקות</span>}
    </button>

   </div>
  </div>
 );

 return (
  <>
   {/* Mobile top bar — only rendered on mobile to avoid invisible focusable elements on desktop */}
   {isMobile && (
   <div className="fixed top-0 right-0 left-0 z-40 bg-card border-b border-sidebar-border px-3 py-2.5 flex items-center justify-between shadow-sm"dir="rtl">
    <button
     onClick={() => setMobileOpen(true)}
     aria-label="פתח תפריט"
     className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
    >
     <HamburgerMenuIcon className="w-5 h-5 text-foreground"/>
    </button>
    
    <button
     onClick={() => window.dispatchEvent(new CustomEvent('global-search-open'))}
     aria-label="חיפוש"
     className="flex-1 max-w-[200px] flex items-center h-9 px-3 rounded-full border border-input bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-colors text-muted-foreground gap-2"
    >
     <MagnifyingGlassIcon className="w-4 h-4 flex-shrink-0"/>
     <span className="text-xs truncate">חיפוש...</span>
    </button>
    
    <div className="flex items-center gap-1">
     {blossomAgentEnabled && (
     <button
      onClick={() => window.dispatchEvent(new CustomEvent('system-assistant-open'))}
      className="ai-glow w-10 h-10 rounded-full flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors text-primary-foreground flex-shrink-0"
      title={AGENT_LABEL}
      aria-label={AGENT_LABEL}
     >
      <Bot className="w-5 h-5"/>
     </button>
     )}
     <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 relative">
      <NotificationBell userEmail={user?.email} />
     </div>
     <Link
      to="/profile"
      className="flex items-center gap-1.5 rounded-full pe-1 ps-2 py-1 hover:bg-muted/60 transition-colors"
     >
      <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
       {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover"/>
       ) : (
        <span className="text-xs font-bold leading-none">{displayName?.[0] || '?'}</span>
       )}
      </div>
     </Link>
    </div>
   </div>
   )}

   {/* Mobile scrim. A CSS transition rather than an exit animation: an exit that
       fails to run used to leave the whole screen dimmed and untappable. */}
   {isMobile && (
    <div
     onClick={closeMobile}
     aria-hidden={!mobileOpen}
     className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity duration-200 ${
      mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
     }`}
    />
   )}

   {/* Mobile drawer — only rendered on mobile */}
   {isMobile && (
   <motion.aside
    initial={{ x: '100%' }}
    animate={{ x: mobileOpen ? 0 : '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    className={`fixed top-0 start-0 bottom-0 w-[187px] bg-card z-50 shadow-2xl ${
     mobileOpen ? '' : 'pointer-events-none'
    }`}
    aria-hidden={!mobileOpen}
   >
    <SidebarContent />
   </motion.aside>
   )}

   {/* Desktop sidebar */}
   <aside className={`hidden md:flex fixed start-0 top-0 bottom-0 bg-card border-e border-sidebar-border flex-col z-40 shadow-md transition-all duration-300 ${
    collapsed ? 'w-16' : 'w-[174px]'
   }`}>
    <SidebarContent isCollapsed={collapsed} />
   </aside>


  </>
 );
}