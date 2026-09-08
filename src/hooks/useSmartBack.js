import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

const STACK_KEY = 'navStack_v1';
const MAX_STACK = 20;

// ── Central parent map — add secondary pages here as one-liners ──────────────
const PARENT_MAP = [
  { match: /^\/projects\/([^/]+)\/edit$/, path: m => `/projects/${m[1]}`, label: 'פרויקט' },
  { match: /^\/projects\/new$/,            path: () => '/projects',        label: 'פרויקטים' },
  { match: /^\/projects\/([^/]+)$/,        path: () => '/projects',        label: 'פרויקטים' },
  { match: /^\/profile$/,                  path: () => '/',               label: 'דף הבית' },
  { match: /^\/notifications$/,            path: () => '/',               label: 'דף הבית' },
];

export function getLogicalParent(pathname) {
  for (const e of PARENT_MAP) {
    const m = pathname.match(e.match);
    if (m) return { path: e.path(m), label: e.label };
  }
  return null;
}

// ── Page titles derived from route ──────────────────────────────────────────
const TITLE_MAP = [
  { match: /^\/$/,                         title: 'דף הבית' },
  { match: /^\/projects\/new$/,            title: 'פרויקט חדש' },
  { match: /^\/projects\/([^/]+)\/edit$/,  title: 'עריכת פרויקט' },
  { match: /^\/projects\/([^/]+)$/,        title: 'פרויקט' },
  { match: /^\/projects$/,                 title: 'פרויקטים' },
  { match: /^\/tasks$/,                    title: 'משימות' },
  { match: /^\/calendar$/,                 title: 'יומן' },
  { match: /^\/support$/,                  title: 'תמיכה' },
  { match: /^\/settings$/,                 title: 'הגדרות' },
  { match: /^\/notifications$/,            title: 'התראות' },
  { match: /^\/profile$/,                  title: 'הפרופיל שלי' },
  { match: /^\/journey$/,                  title: 'מסע המערכת' },
];

export function getPageTitle(pathname) {
  for (const e of TITLE_MAP) {
    if (pathname.match(e.match)) return e.title;
  }
  return 'עמוד קודם';
}

// ── Stack utilities ──────────────────────────────────────────────────────────
function readStack() {
  try { return JSON.parse(sessionStorage.getItem(STACK_KEY) || '[]'); }
  catch { return []; }
}

function writeStack(stack) {
  try { sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK))); }
  catch { /* ignore */ }
}

export function clearNavStack() {
  try { sessionStorage.removeItem(STACK_KEY); } catch { /* ignore */ }
}

let _pendingScroll = null;

// Called by AppLayout during render (not in an effect) so children see the updated stack
export function handleRouteChange(prevPath, newPath, scrollY) {
  if (prevPath === newPath) return;

  const stack = readStack();
  const top = stack[stack.length - 1];

  if (top && top.path === newPath) {
    // Navigated back to a page in the stack — pop and schedule scroll restore
    stack.pop();
    writeStack(stack);
    _pendingScroll = top.scrollY;
  } else {
    // Forward navigation — push the page we left (with its scroll position)
    if (prevPath && (!top || top.path !== prevPath)) {
      stack.push({ path: prevPath, title: getPageTitle(prevPath), scrollY });
      writeStack(stack);
    }
  }
}

export function consumePendingScroll() {
  const y = _pendingScroll;
  _pendingScroll = null;
  return y;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSmartBack() {
  const navigate = useNavigate();
  const location = useLocation();

  const stack = readStack();
  const backLabel = stack.length > 0
    ? `חזרה ל${stack[stack.length - 1].title || 'עמוד קודם'}`
    : (() => {
        const parent = getLogicalParent(location.pathname);
        return parent ? `חזרה ל${parent.label}` : 'חזרה';
      })();

  const goBack = useCallback(() => {
    const s = readStack();
    if (s.length > 0) {
      navigate(s[s.length - 1].path);
    } else {
      const parent = getLogicalParent(location.pathname);
      navigate(parent ? parent.path : '/');
    }
  }, [navigate, location.pathname]);

  return { goBack, backLabel };
}