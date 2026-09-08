import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, ArrowLeft, ArrowRight, Globe, History, X, Loader2, ShieldAlert,
  ChevronDown, ChevronUp, Maximize2, Minimize2, ChevronDown as ChevronDownIcon,
  SquareCheckBig, Flag, CalendarCheck, BellRing, Undo2, BookOpen, BookOpenCheck,
  ListChecks, Mail, LifeBuoy, ScrollText, MessagesSquare, CheckCheck, SquarePen,
  SlidersHorizontal, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import AgentTraceCard from '@/components/shared/AgentTraceCard';
import AssistantMessage from '@/components/shared/AssistantMessage';
import AssistantEmptyState from '@/components/shared/AssistantEmptyState';
import AssistantHistoryPanel from '@/components/shared/AssistantHistoryPanel';
import AssistantResultCard from '@/components/shared/AssistantResultCard';
import ActionExecutionOverlay from '@/components/shared/ActionExecutionOverlay';
import { useProjectFromUrl } from '@/lib/useProjectFromUrl';
import { getCapabilityGroups, CAPABILITIES } from '@/lib/agentCapabilities';
import { formatHebrewDate } from '@/lib/normalizeValues';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { captureError } from '@/lib/errorCapture';
import { getErrorInfo } from '@/lib/errors';
import { entityLabel, fieldLabel, enumValueHe } from '@/lib/agentLabels';

const ACTION_ICONS = {
  createTask: SquareCheckBig,
  updateTask: SquarePen,
  addTaskComment: MessagesSquare,
  addFlag: Flag,
  markTaskDone: CheckCheck,
  resolveFlag: Flag,
  createMeeting: CalendarCheck,
  createReminder: BellRing,
  revertLastAction: Undo2,
  batch: ListChecks,
  openGuide: BookOpen,
  applyPlaybook: BookOpenCheck,
  summarizeMeetingAction: ScrollText,
  createTasksFromMeeting: ListChecks,
  sendEmail: Mail,
  createSupportTicket: LifeBuoy,
  updateTicketStatus: LifeBuoy,
};

// Capability groups now sourced from the central registry (agentCapabilities.js)

export default function SystemAssistantSheet() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState('global');
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [showHistory, setShowHistory] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [disabledActions, setDisabledActions] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [pendingSend, setPendingSend] = useState(null);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isNearBottomRef = useRef(true);

  const { project, projectId: urlProjectId, isLoading: projectLoading } = useProjectFromUrl();

  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      setScope(project?.id || 'global');
      setSessionId(crypto.randomUUID());
      setMessages([]);
      setShowHistory(false);
      setShowCapabilities(false);
      const prompt = e?.detail?.prompt;
      if (prompt) {
        if (e.detail.autoSend) {
          setInput('');
          setPendingSend(prompt);
        } else {
          setInput(prompt);
          setTimeout(() => textareaRef.current?.focus(), 120);
        }
      }
    };
    window.addEventListener('system-assistant-open', handler);
    return () => window.removeEventListener('system-assistant-open', handler);
  }, [project?.id]);

  useEffect(() => {
    if (open) api.functions.invoke('askSystem', { warmup: true }).catch(() => {});
  }, [open]);

  // Auto-send a prompt handed over by an external launcher (dashboard agent widget).
  // The small delay lets the warmup invoke fire first.
  useEffect(() => {
    if (!open || !pendingSend) return;
    const q = pendingSend;
    setPendingSend(null);
    const t = setTimeout(() => sendMessage(q), 60);
    return () => clearTimeout(t);
     
  }, [open, pendingSend]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  useEffect(() => {
    if (open && user) {
      setDisabledActions(user.agent_disabled_actions || []);
    }
  }, [open, user]);

  const { data: allExchanges = [] } = useQuery({
    queryKey: ['assistant-exchanges'],
    queryFn: () => api.entities.AssistantExchange.filter({}, '-created_date', 200),
    enabled: open,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.entities.TeamMember.list(),
    enabled: open,
  });
  const teamMember = useMemo(
    () => teamMembers.find(m => (m.email || '').toLowerCase().trim() === (user?.email || '').toLowerCase().trim()),
    [teamMembers, user?.email]
  );
  const displayName = teamMember?.name || '';

  const { data: globalTabRes } = useQuery({
    queryKey: ['global-tab-visibility'],
    queryFn: () => api.functions.invoke('globalTabVisibility', {}),
    retry: 2,
    meta: { silent: true },
    enabled: open,
  });
  const globalTabVisibility = globalTabRes?.data?.value || {};

  const { data: systemFeaturesRes } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'global_system_features' }),
    retry: 2,
    meta: { silent: true },
    enabled: open,
  });
  const systemFeatures = systemFeaturesRes?.data?.value || {};
  const systemDisabledFeatures = useMemo(() => {
    const disabled = new Set();
    for (const [featureId, level] of Object.entries(systemFeatures)) {
      if (level === 'closed') disabled.add(featureId);
      else if (level === 'admin' && user?.role !== 'admin') disabled.add(featureId);
    }
    return disabled;
  }, [systemFeatures, user?.role]);

  // CAPABILITY_TO_FEATURE is now in the central registry (agentCapabilities.js)

  const sessions = useMemo(() => {
    const map = {};
    allExchanges.forEach(ex => {
      const sid = ex.session_id;
      if (!sid) return;
      if (!map[sid]) {
        map[sid] = {
          id: sid,
          title: ex.session_title || (ex.question ? ex.question.slice(0, 60) : 'שיחה'),
          timestamp: ex.created_date,
        };
      }
      if (new Date(ex.created_date) > new Date(map[sid].timestamp)) {
        map[sid].timestamp = ex.created_date;
      }
    });
    return Object.values(map).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [allExchanges]);

  const effectiveDisabled = useMemo(() => {
    const set = new Set(disabledActions);
    for (const cap of CAPABILITIES) {
      if (cap.featureId && systemDisabledFeatures.has(cap.featureId)) set.add(cap.id);
    }
    return Array.from(set);
  }, [disabledActions, systemDisabledFeatures]);

  const capabilityGroups = useMemo(
    () => getCapabilityGroups({ systemDisabledFeatures, userDisabledActions: new Set(disabledActions), isAdmin: user?.role === 'admin' }),
    [systemDisabledFeatures, disabledActions, user?.role]
  );
  const activeCapabilitiesCount = capabilityGroups.length;

  const toggleCapability = async (capId) => {
    const current = new Set(disabledActions);
    if (current.has(capId)) current.delete(capId);
    else current.add(capId);
    const newArray = Array.from(current);
    const prev = disabledActions;
    setDisabledActions(newArray);
    try {
      await api.auth.updateMe({ agent_disabled_actions: newArray });
    } catch (e) {
      setDisabledActions(prev);
      toast.error('שמירת ההעדפה נכשלה');
    }
  };

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  };
  useEffect(() => { adjustTextarea(); }, [input]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    setShowScrollFab(!nearBottom);
  };

  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (open && isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setShowHistory(false);
  };

  const selectSession = (sid) => {
    const sessionExchanges = allExchanges
      .filter(e => e.session_id === sid)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const msgs = [];
    sessionExchanges.forEach(ex => {
      msgs.push({ role: 'user', content: ex.question });
      msgs.push({
        role: 'assistant',
        content: ex.answer,
        source: ex.source_type,
        followUps: ex.follow_ups || [],
        visual: ex.visual || null,
        total_ms: ex.total_ms,
        feedback: ex.feedback || null,
      });
    });
    setMessages(msgs);
    setSessionId(sid);
    setShowHistory(false);
  };

  const deleteSession = async (sid, e) => {
    e.stopPropagation();
    try {
      await api.entities.AssistantExchange.deleteMany({ session_id: sid });
      queryClient.invalidateQueries({ queryKey: ['assistant-exchanges'] });
      if (sid === sessionId) startNewChat();
    } catch { /* ignore */ }
  };

  const handleFeedback = async (feedback, question) => {
    if (!question) return;
    const normalized = question.toLowerCase().trim()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');
    try {
      // Find the exchange record matching this question in the current session
      const matches = await api.entities.AssistantExchange.filter({
        session_id: sessionId,
        normalized_question: normalized,
      });
      if (matches.length === 0) return;
      const target = matches[0]; // most recent (sorted by -created_date)
      // Save feedback on the record — askSystem already excludes disliked records from cache lookups
      await api.entities.AssistantExchange.update(target.id, { feedback });
      queryClient.invalidateQueries({ queryKey: ['assistant-exchanges'] });
    } catch { /* ignore — feedback is best-effort */ }
  };

  const sendMessage = async (overrideQuestion) => {
    const question = (overrideQuestion || input).trim();
    if (!question || loading || actionInProgress) return;
    const msgId = crypto.randomUUID();
    // Add user message with 'sending' state — DON'T clear input yet
    setMessages(prev => [...prev, { role: 'user', content: question, msgId, status: 'sending' }]);
    setLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.functions.invoke('askSystem', {
        question,
        projectId: scope !== 'global' ? scope : undefined,
        sessionId,
        history,
      });
      // Mark user message as sent, then add assistant response
      setMessages(prev => [...prev.map(m => m.msgId === msgId ? { ...m, status: 'sent' } : m), {
        role: 'assistant',
        content: data?.answer || 'אירעה שגיאה.',
        source: data?.source_type || 'pending',
        followUps: data?.follow_ups || [],
        visual: data?.visual || null,
        pendingAction: data?.pending_action || null,
        actionResolved: false,
        total_ms: data?.total_ms,
        isNew: true,
      }]);
      // Only clear input after success
      if (!overrideQuestion) setInput('');
    } catch (err) {
      // Route through the error catalog for a structured error with code
      const { code } = captureError({
        error: err,
        code: 'ERR_AI_FAILED_402',
        operation: 'askSystem',
        entityOrFunction: 'askSystem',
        context: { silent: true },
      });
      const errInfo = getErrorInfo(code);
      setMessages(prev => [...prev.map(m => m.msgId === msgId ? { ...m, status: 'failed' } : m), {
        role: 'assistant',
        content: `${errInfo.title} — ${errInfo.message}`,
        source: 'error',
        errorCode: code,
        errorNext: errInfo.next,
        retryQuestion: question,
      }]);
      if (!overrideQuestion) setInput(question);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const scopeLabel = scope === 'global' ? 'כל המערכת' : (project?.client_name || project?.name || 'פרויקט');
  const canToggleScope = !!project?.id;

  const panelSizeClass = expanded
    ? 'sm:w-[400px] sm:h-[calc(100dvh/1.15)]'
    : 'sm:w-[400px] sm:h-[560px]';

  const headerBtnStyle = {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] sm:hidden"
          />
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            dir="rtl"
            className={`fixed z-50 top-0 left-0 right-0 h-[100dvh] sm:top-auto sm:right-auto bg-card sm:rounded-[22px] border-0 sm:border flex flex-col overflow-hidden transition-[width,height] duration-300 ${panelSizeClass} ${expanded ? 'sm:bottom-0 sm:left-0 sm:rounded-none agent-expanded-text' : 'sm:bottom-4 sm:left-4 sm:max-h-[calc(100dvh-2rem)]'}`}
            style={{ boxShadow: '0 34px 74px -30px rgba(11,44,27,.45)', borderColor: 'hsl(var(--border))' }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              {/* Right (RTL start): History + Expand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  onClick={() => { setShowHistory(s => !s); setShowCapabilities(false); }}
                  style={{ ...headerBtnStyle, background: showHistory ? 'hsl(var(--accent))' : 'transparent' }}
                  onMouseEnter={(e) => { if (!showHistory) e.currentTarget.style.background = 'hsl(var(--accent))'; }}
                  onMouseLeave={(e) => { if (!showHistory) e.currentTarget.style.background = 'transparent'; }}
                  title="היסטוריית שיחות"
                >
                  <History size={16} color={showHistory ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
                </button>
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{ ...headerBtnStyle, display: undefined }}
                  className="!hidden sm:!flex"
                  title={expanded ? 'כיווץ' : 'מסך מלא'}
                >
                  {expanded ? <Minimize2 size={16} color="hsl(var(--muted-foreground))" /> : <Maximize2 size={16} color="hsl(var(--muted-foreground))" />}
                </button>
              </div>

              {/* Center: Title + scope info */}
              <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', fontFamily: 'Heebo, sans-serif' }}>
                  {AGENT_LABEL}
                </div>
                <button
                  onClick={() => canToggleScope && setScope(s => s === 'global' ? project?.id : 'global')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'hsl(var(--muted-foreground))',
                    border: 'none',
                    background: 'transparent',
                    cursor: canToggleScope ? 'pointer' : 'default',
                    marginTop: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'center',
                  }}
                >
                  {scope === 'global' ? <Globe size={11} /> : <CubeIcon style={{ width: '11px', height: '11px' }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                    גישה: {scopeLabel}
                  </span>
                </button>
              </div>

              {/* Left (RTL end): Capabilities + Close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  onClick={() => { setShowCapabilities(s => !s); setShowHistory(false); }}
                  style={{ ...headerBtnStyle, background: showCapabilities ? 'hsl(var(--accent))' : 'transparent' }}
                  onMouseEnter={(e) => { if (!showCapabilities) e.currentTarget.style.background = 'hsl(var(--accent))'; }}
                  onMouseLeave={(e) => { if (!showCapabilities) e.currentTarget.style.background = 'transparent'; }}
                  title="יכולות הסוכן"
                >
                  <SlidersHorizontal size={16} color={showCapabilities ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={headerBtnStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--accent))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  title="סגירה"
                >
                  <X size={16} color="hsl(var(--muted-foreground))" />
                </button>
              </div>
            </div>

            {showCapabilities ? (
              /* Capabilities view */
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setShowCapabilities(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'hsl(var(--primary))',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowRight size={16} />
                    חזרה
                  </button>
                  <h3 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: '20px', color: 'hsl(var(--foreground))', margin: 0 }}>
                    יכולות הסוכן
                  </h3>
                </div>
                <p style={{ fontSize: '13px', fontWeight: 400, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                  כבה יכולת כדי שהסוכן לא יבצע אותה.
                </p>
                <div>
                  {capabilityGroups.map((cap) => {
                    const isDisabled = effectiveDisabled.includes(cap.id);
                    return (
                      <div key={cap.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '13px 0',
                        borderBottom: '1px solid hsl(var(--border))',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{cap.name}</div>
                          <div style={{ fontSize: '13px', fontWeight: 400, color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{cap.description}</div>
                        </div>
                        <button
                          onClick={() => toggleCapability(cap.id)}
                          style={{
                            width: '44px',
                            height: '26px',
                            borderRadius: '13px',
                            background: isDisabled ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                            flexShrink: 0,
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: isDisabled ? '3px' : '21px',
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* History panel */}
                {showHistory && (
                  <AssistantHistoryPanel
                    sessions={sessions}
                    activeSessionId={sessionId}
                    onSelect={selectSession}
                    onDelete={deleteSession}
                    onNewChat={startNewChat}
                  />
                )}

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto relative"
                  style={{ padding: '12px' }}
                >
                  {messages.length === 0 ? (
                    <AssistantEmptyState
                      scope={scope === 'global' ? 'global' : 'project'}
                      userName={displayName}
                      onSampleClick={sendMessage}
                      systemDisabledFeatures={systemDisabledFeatures}
                      userDisabledActions={new Set(disabledActions)}
                      isAdmin={user?.role === 'admin'}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {messages.map((msg, i) => (
                        <div key={i}>
                          <AssistantMessage
                            msg={msg}
                            onFollowUp={sendMessage}
                            isNew={msg.isNew}
                            question={msg.role === 'assistant' ? messages[i - 1]?.content : undefined}
                            onFeedback={msg.role === 'assistant' ? (fb) => handleFeedback(fb, messages[i - 1]?.content) : undefined}
                          />
                          {msg.source === 'error' && msg.retryQuestion && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                              {msg.errorCode && (
                                <span style={{ fontSize: '11px', color: 'hsl(var(--destructive))', fontWeight: 600 }}>
                                  קוד שגיאה: {msg.errorCode}
                                </span>
                              )}
                              {msg.errorNext && (
                                <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
                                  {msg.errorNext}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setMessages(prev => prev.filter((_, mi) => mi !== i && mi !== i - 1));
                                  sendMessage(msg.retryQuestion);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 14px',
                                  borderRadius: '10px',
                                  border: '1px solid hsl(var(--border))',
                                  background: 'hsl(var(--card))',
                                  color: 'hsl(var(--foreground))',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  alignSelf: 'flex-start',
                                }}
                              >
                                <Undo2 size={14} />
                                נסה שוב
                              </button>
                            </div>
                          )}
                          {msg.pendingAction && !msg.actionResolved && (
                            <PendingActionCard
                              pendingAction={msg.pendingAction}
                              originalQuestion={messages[i - 1]?.content || ''}
                              onFeedback={(fb) => handleFeedback(fb, messages[i - 1]?.content)}
                              onEdit={(q) => {
                                setInput(q);
                                setMessages(prev => prev.map((m, mi) =>
                                  mi === i ? { ...m, actionResolved: true } : m
                                ));
                                setTimeout(() => textareaRef.current?.focus(), 100);
                              }}
                              onConfirm={async (selectedIds) => {
                                setActionInProgress(true);
                                const action = msg.pendingAction.action;
                                if (action === 'openGuide') {
                                  const guideId = msg.pendingAction.params.guide_id;
                                  if (guideId) {
                                    navigate(`/guides?guideId=${guideId}`);
                                    setOpen(false);
                                  } else {
                                    toast.error('מזהה המדריך חסר');
                                  }
                                  setMessages(prev => prev.map((m, mi) =>
                                    mi === i ? { ...m, actionResolved: true } : m
                                  ));
                                  return true;
                                }
                                if (action === 'applyPlaybook') {
                                  try {
                                    await api.functions.invoke('applyPlaybook', {
                                      projectId: msg.pendingAction.params.project_id,
                                      templateId: msg.pendingAction.params.template_id,
                                    });
                                    toast.success('חיי הפרויקט הוחלו בהצלחה');
                                    queryClient.invalidateQueries({ queryKey: ['projectStages'] });
                                    queryClient.invalidateQueries({ queryKey: ['checklistItems'] });
                                    queryClient.invalidateQueries({ queryKey: ['project'] });
                                    setMessages(prev => prev.map((m, mi) =>
                                      mi === i ? { ...m, actionResolved: true } : m
                                    ));
                                    return true;
                                  } catch (err) {
                                    toast.error('הפעולה נכשלה');
                                    const errData = err?.response?.data || {};
                                    setMessages(prev => prev.map((m, mi) =>
                                      mi === i ? { ...m, actionResolved: true, actionFailed: true, errorCode: errData.code || 'ERR_AGENT_ACTION_601', requestId: errData.request_id || '' } : m
                                    ));
                                    return false;
                                  }
                                }
                                try {
                                   const res = await api.functions.invoke('agentAction', {
                                     action,
                                     params: msg.pendingAction.params,
                                     selected_operation_ids: selectedIds,
                                   });
                                   if (res.data?.success) {
                                     toast.success('הפעולה בוצעה בהצלחה');
                                     queryClient.invalidateQueries({ queryKey: ['tasks'] });
                                     queryClient.invalidateQueries({ queryKey: ['projectNotes'] });
                                     queryClient.invalidateQueries({ queryKey: ['meetingLogs'] });
                                     setMessages(prev => prev.map((m, mi) =>
                                       mi === i ? { ...m, actionResolved: true } : m
                                     ));
                                     return true;
                                   } else {
                                     toast.error('הפעולה נכשלה');
                                     setMessages(prev => prev.map((m, mi) =>
                                       mi === i ? { ...m, actionResolved: true, actionFailed: true, errorCode: res.data?.code || 'ERR_AGENT_ACTION_601', requestId: res.data?.request_id || '' } : m
                                     ));
                                     return false;
                                   }
                                   } catch (err) {
                                   toast.error('הפעולה נכשלה');
                                   const errData = err?.response?.data || {};
                                   setMessages(prev => prev.map((m, mi) =>
                                     mi === i ? { ...m, actionResolved: true, actionFailed: true, errorCode: errData.code || 'ERR_AGENT_ACTION_601', requestId: errData.request_id || '' } : m
                                   ));
                                   return false;
                                   } finally {
                                   setActionInProgress(false);
                                 }
                                }}
                              onCancel={() => {
                                setMessages(prev => prev.map((m, mi) =>
                                  mi === i ? { ...m, actionResolved: true } : m
                                ));
                              }}
                            />
                          )}
                          {msg.pendingAction && msg.actionResolved && !msg.actionFailed && (
                            <AssistantResultCard
                              pendingAction={msg.pendingAction}
                              onFeedback={(fb) => handleFeedback(fb, messages[i - 1]?.content)}
                              onRevert={() => sendMessage('בטל את הפעולה האחרונה')}
                              onNavigate={(path) => { navigate(path); setOpen(false); }}
                            />
                          )}
                          {msg.pendingAction && msg.actionResolved && msg.actionFailed && (
                            <ErrorDisplay
                              code={msg.errorCode || 'ERR_AGENT_ACTION_601'}
                              context={{ userEmail: user?.email, route: location.pathname, requestId: msg.requestId, action: msg.pendingAction?.action, params: msg.pendingAction?.params }}
                              compact
                            />
                          )}
                        </div>
                      ))}
                      {loading && <AgentTraceCard />}
                      <div ref={bottomRef} />

                      {/* Scroll-to-bottom FAB */}
                      <AnimatePresence>
                        {showScrollFab && (
                          <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            onClick={scrollToBottom}
                            className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 bg-card border border-border shadow-md rounded-full px-3 py-1.5 text-xs flex items-center gap-1 hover:bg-accent transition-colors"
                          >
                            <ChevronDownIcon className="w-3 h-3" />
                            להודעה האחרונה
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div style={{
                  padding: '10px 12px',
                  borderTop: '1px solid hsl(var(--border))',
                  flexShrink: 0,
                  background: 'hsl(var(--card))',
                }}>

                  {/* Input row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={actionInProgress ? 'מבצע פעולה… המתן' : 'תאר מה צריך לקרות…'}
                      rows={1}
                      disabled={loading || actionInProgress}
                      dir="rtl"
                      style={{
                        flex: 1,
                        resize: 'none',
                        border: '1.5px solid hsl(var(--border))',
                        borderRadius: '14px',
                        padding: '9px 12px',
                        fontSize: '15px',
                        fontFamily: 'Heebo, sans-serif',
                        outline: 'none',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        maxHeight: '96px',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
                    />
                    {/* Send button */}
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading || actionInProgress}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'hsl(var(--primary))',
                        border: 'none',
                        cursor: (!input.trim() || loading || actionInProgress) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        opacity: (!input.trim() || loading || actionInProgress) ? 0.4 : 1,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (input.trim() && !loading && !actionInProgress) e.currentTarget.style.background = 'hsl(var(--primary))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--primary))'; }}
                    >
                      <ArrowLeft size={16} color="white" />
                    </button>
                  </div>
                  {/* Footer row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}>
                      כל פעולה דורשת אישור
                    </span>
                    <span className="hidden sm:inline" style={{ fontSize: '12px', fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}>
                      Enter לשליחה
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const DATE_FIELDS = ['due_date', 'target_date', 'date', 'deadline'];
const FIELD_LABELS = {
  due_date: 'תאריך יעד', target_date: 'תאריך יעד', date: 'תאריך', deadline: 'תאריך יעד',
  assigned_to: 'אחראי', priority: 'עדיפות', severity: 'חומרה', status: 'סטטוס',
  description: 'תיאור', title: 'כותרת', name: 'שם', to: 'אל', subject: 'נושא',
  content: 'תוכן', type: 'סוג',
};

function getKeyValueRows(params) {
  const rows = [];
  if (params.title) rows.push({ key: 'כותרת', value: params.title });
  if (params.name) rows.push({ key: 'שם', value: params.name });
  if (params.assigned_to) rows.push({ key: 'אחראי', value: params.assigned_to });
  if (params.due_date) rows.push({ key: 'תאריך יעד', value: DATE_FIELDS.includes('due_date') ? formatHebrewDate(params.due_date) : params.due_date });
  if (params.target_date) rows.push({ key: 'תאריך יעד', value: formatHebrewDate(params.target_date) });
  if (params.date) rows.push({ key: 'תאריך', value: formatHebrewDate(params.date) });
  if (params.priority) rows.push({ key: 'עדיפות', value: enumValueHe(params.priority) });
  if (params.severity) rows.push({ key: 'חומרה', value: enumValueHe(params.severity) });
  if (params.to) rows.push({ key: 'אל', value: params.to });
  if (params.subject) rows.push({ key: 'נושא', value: params.subject });
  return rows;
}

// Build summary from diff (changedFields) — not from LLM summary
function buildSummaryFromDiff(plan, pendingAction) {
  if (!plan || !plan.operations || plan.operations.length === 0) return pendingAction.summary;
  const updateOp = plan.operations.find(o => o.op === 'update' && o.changedFields && o.changedFields.length > 0);
  if (!updateOp) return pendingAction.summary;
  const parts = [];
  for (const field of updateOp.changedFields) {
    const label = fieldLabel(field);
    const newVal = updateOp.after?.[field];
    const displayVal = DATE_FIELDS.includes(field) ? formatHebrewDate(newVal) : newVal;
    parts.push(`${label}: ${displayVal}`);
  }
  return parts.length > 0 ? `עדכון: ${parts.join(', ')}` : pendingAction.summary;
}

// Find fields in params that should have been in the diff but aren't
function findUnrecognizedFields(plan, pendingAction) {
  if (!plan || !plan.operations || pendingAction.action !== 'updateTask') return [];
  const updateOp = plan.operations.find(o => o.op === 'update');
  if (!updateOp) return [];
  const changedFields = updateOp.changedFields || [];
  const expectedFields = ['due_date', 'assigned_to', 'priority', 'status', 'description']
    .filter(f => pendingAction.params?.[f] !== undefined && pendingAction.params?.[f] !== null && pendingAction.params?.[f] !== '');
  return expectedFields.filter(f => !changedFields.includes(f));
}

function PendingActionCard({ pendingAction, originalQuestion, onEdit, onConfirm, onCancel, onFeedback }) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [acknowledgeDelete, setAcknowledgeDelete] = useState(false);
  const [expandedEntities, setExpandedEntities] = useState({});
  const [executionStatus, setExecutionStatus] = useState('idle');
  const [cancelled, setCancelled] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isFrontendOnly = pendingAction.action === 'openGuide';
  const ActionIcon = ACTION_ICONS[pendingAction.action] || Bot;

  useEffect(() => {
    if (isFrontendOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.functions.invoke('agentAction', {
          action: pendingAction.action,
          params: pendingAction.params,
          preview: true,
        });
        if (cancelled) return;
        const planData = res?.data?.plan;
        setPlan(planData);
        setSelectedIds((planData?.operations || []).map(o => o.id));
      } catch (err) {
        if (!cancelled) setPlanError(err?.response?.data?.error || 'שגיאה בטעינת התוכנית');
      }
    })();
    return () => { cancelled = true; };
  }, [pendingAction, isFrontendOnly]);

  const hasDelete = (plan?.operations || []).some(o => o.op === 'delete');
  const canExecute = isFrontendOnly || (selectedIds.length > 0 && (!hasDelete || acknowledgeDelete));

  const toggleOp = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleEntity = (entity) => {
    setExpandedEntities(prev => ({ ...prev, [entity]: !prev[entity] }));
  };

  const handleConfirm = async () => {
    if (loading || resolved || !canExecute) return;
    setLoading(true);
    if (!isFrontendOnly) setExecutionStatus('executing');
    const success = await onConfirm(selectedIds);
    setLoading(false);
    if (isFrontendOnly) {
      setResolved(true);
      return;
    }
    setExecutionStatus(success ? 'success' : 'error');
    setTimeout(() => {
      if (success) setResolved(true);
      setExecutionStatus('idle');
    }, success ? 2000 : 1500);
  };

  const handleCancel = () => {
    if (loading || resolved || cancelled) return;
    setCancelled(true);
    onCancel();
  };

  const groupedOps = useMemo(() => {
    if (!plan) return {};
    const groups = {};
    for (const op of plan.operations) {
      if (!groups[op.entity]) groups[op.entity] = [];
      groups[op.entity].push(op);
    }
    return groups;
  }, [plan]);

  const diffSummary = useMemo(() => plan ? buildSummaryFromDiff(plan, pendingAction) : pendingAction.summary, [plan, pendingAction]);
  const unrecognizedFields = useMemo(() => plan ? findUnrecognizedFields(plan, pendingAction) : [], [plan, pendingAction]);

  if (resolved) return null;

  const kvRows = getKeyValueRows(pendingAction.params || {});

  return (
    <div style={{
      marginTop: '8px',
      borderRadius: '14px',
      border: '1px solid hsl(var(--border))',
      background: 'hsl(var(--card))',
      overflow: 'hidden',
      opacity: cancelled ? 0.55 : 1,
      position: 'relative',
    }}>
      {/* Cancelled overlay badge */}
      {cancelled && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: 'hsl(var(--muted-foreground))',
          color: 'white',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 10px',
          borderRadius: '99px',
          zIndex: 2,
        }}>
          בוטל
        </div>
      )}
      {/* Approval box */}
      <div style={{
        background: 'hsl(var(--muted))',
        padding: '13px',
        maxHeight: cancelled ? 'none' : '300px',
        overflowY: cancelled ? 'visible' : 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: kvRows.length > 0 ? '10px' : '0' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '9px',
            background: 'hsl(var(--success-muted))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ActionIcon size={15} color="hsl(var(--primary))" />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, paddingTop: '4px' }}>
            {diffSummary}
          </p>
        </div>
        {/* Key-value rows */}
        {kvRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {kvRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>{row.key}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan details */}
      {planError && (
        <div style={{ fontSize: '12px', color: 'hsl(var(--destructive))', padding: '8px 13px' }}>{planError}</div>
      )}

      {isFrontendOnly ? (
        <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', padding: '8px 13px' }}>
          לחץ על "פתח מדריך" כדי לפתוח את המדריך בכרטיסייה נפרדת.
        </div>
      ) : plan && (
        <div style={{ padding: '0 13px 13px 13px' }}>
          <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px', marginTop: '8px' }}>
            ייווצרו {plan.summary.creates} · יעודכן {plan.summary.updates} · יימחק {plan.summary.deletes}
          </div>

          {plan.warnings.map((w, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              background: 'hsl(var(--warning-muted))',
              color: 'hsl(var(--warning))',
              borderRadius: '8px',
              padding: '6px 8px',
              marginBottom: '6px',
            }}>
              <ShieldAlert size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '12px' }}>{w}</span>
            </div>
          ))}

          {unrecognizedFields.map((field, i) => (
            <div key={`unrec-${i}`} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              background: 'hsl(var(--destructive) / 0.1)',
              color: 'hsl(var(--destructive))',
              borderRadius: '8px',
              padding: '6px 8px',
              marginBottom: '6px',
            }}>
              <ShieldAlert size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '12px' }}>לא זיהיתי כיצד לעדכן: {FIELD_LABELS[field] || field}. ייתכן שהערך זהה לנוכחי.</span>
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {Object.entries(groupedOps).map(([entity, ops]) => {
              const expanded = expandedEntities[entity] !== false;
              return (
                <div key={entity} style={{ borderRadius: '8px', background: 'hsl(var(--muted))', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleEntity(entity)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{entityLabel(entity, ops.length)} ({ops.length})</span>
                    {expanded ? <ChevronUp size={12} color="hsl(var(--muted-foreground))" /> : <ChevronDown size={12} color="hsl(var(--muted-foreground))" />}
                  </button>
                  {expanded && (
                    <div style={{ padding: '0 8px 8px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {ops.map(op => (
                        <div key={op.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <Checkbox
                            checked={selectedIds.includes(op.id)}
                            onCheckedChange={() => toggleOp(op.id)}
                            className="mt-0.5"
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '99px',
                                fontWeight: 600,
                                background: op.op === 'create' ? 'hsl(var(--success-muted))' : op.op === 'update' ? 'hsl(var(--info-muted))' : 'hsl(var(--destructive) / 0.1)',
                                color: op.op === 'create' ? 'hsl(var(--primary))' : op.op === 'update' ? 'hsl(var(--info))' : 'hsl(var(--destructive))',
                              }}>
                                {op.op === 'create' ? 'יצירה' : op.op === 'update' ? 'עדכון' : 'מחיקה'}
                              </span>
                              <span style={{ fontSize: '12px', color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.label}</span>
                            </div>
                            {op.op === 'update' && op.changedFields && op.changedFields.length > 0 && (
                              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {op.changedFields.map(field => {
                                  const isDate = DATE_FIELDS.includes(field);
                                  const beforeVal = isDate ? formatHebrewDate(op.before?.[field]) : enumValueHe(String(op.before?.[field] ?? ''));
                                  const afterVal = isDate ? formatHebrewDate(op.after?.[field]) : enumValueHe(String(op.after?.[field] ?? ''));
                                  return (
                                    <div key={field} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>{fieldLabel(field)}:</span>
                                      <span style={{ textDecoration: 'line-through', color: 'hsl(var(--muted-foreground))' }}>{beforeVal}</span>
                                      <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>← {afterVal}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasDelete && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }}>
              <Checkbox
                checked={acknowledgeDelete}
                onCheckedChange={() => setAcknowledgeDelete(v => !v)}
              />
              <span>אני מאשר/ת שפעולות המחיקה יבוצעו ואינן הפיכות</span>
            </label>
          )}
        </div>
      )}

      {/* Buttons — sticky at bottom, hidden when cancelled */}
      {!cancelled && (
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 13px 13px 13px',
        position: 'sticky',
        bottom: 0,
        background: 'hsl(var(--card))',
        borderTop: '1px solid hsl(var(--border))',
        zIndex: 1,
      }}>
        <button
          onClick={handleConfirm}
          disabled={loading || !canExecute}
          style={{
            background: 'hsl(var(--primary))',
            color: 'white',
            borderRadius: '10px',
            border: 'none',
            height: '36px',
            padding: '0 15px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: (loading || !canExecute) ? 'not-allowed' : 'pointer',
            opacity: (loading || !canExecute) ? 0.5 : 1,
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { if (!loading && canExecute) e.currentTarget.style.background = 'hsl(var(--primary))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--primary))'; }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {isFrontendOnly ? 'פתח מדריך' : 'אישור וביצוע'}
        </button>
        {!isFrontendOnly && originalQuestion && (
          <button
            onClick={() => onEdit(originalQuestion)}
            disabled={loading}
            style={{
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              borderRadius: '10px',
              border: '1px solid hsl(var(--border))',
              height: '36px',
              padding: '0 15px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            עריכה
          </button>
        )}
        <button
          onClick={handleCancel}
          disabled={loading}
          style={{
            background: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            borderRadius: '10px',
            border: 'none',
            height: '36px',
            padding: '0 15px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          ביטול
        </button>
      </div>
      )}

      <ActionExecutionOverlay
        visible={executionStatus !== 'idle'}
        status={executionStatus}
        actionLabel={pendingAction.summary}
        operations={(plan?.operations || []).map(o => ({ label: o.label }))}
      />

      {onFeedback && (
        <div style={{ display: 'flex', gap: '2px', padding: '4px 13px 8px' }}>
          <button
            onClick={() => { if (feedback) return; setFeedback('like'); onFeedback('like'); }}
            style={{
              padding: '3px', borderRadius: '6px', border: 'none',
              background: feedback === 'like' ? 'hsl(var(--success-muted))' : 'transparent',
              cursor: feedback ? 'default' : 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            title="תשובה טובה"
          >
            <ThumbsUp size={13} color={feedback === 'like' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
          </button>
          <button
            onClick={() => { if (feedback) return; setFeedback('dislike'); onFeedback('dislike'); }}
            style={{
              padding: '3px', borderRadius: '6px', border: 'none',
              background: feedback === 'dislike' ? 'hsl(var(--destructive) / 0.1)' : 'transparent',
              cursor: feedback ? 'default' : 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            title="תשובה לא מדויקת"
          >
            <ThumbsDown size={13} color={feedback === 'dislike' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'} />
          </button>
        </div>
      )}
    </div>
  );
}