import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, Bot, FileText, AlertCircle, History, Plus, MessageSquare, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDate } from '@/lib/formatDate';
import TypingIndicator from '@/components/shared/TypingIndicator';

const POS_KEY = 'aiChatBtnPos';

export default function ProjectAIChat({ project, teamMembers = [] }) {
 const projectId = project.id;
 const queryClient = useQueryClient();
 const [open, setOpen] = useState(false);
 const [showHistory, setShowHistory] = useState(false);
 const [messages, setMessages] = useState([]);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const [convId, setConvId] = useState(null);
 const newChatRef = useRef(false);
 const bottomRef = useRef(null);

 const defaultPos = () => ({ top: window.innerHeight - 88, left: 20 });
 const [pos, setPos] = useState(() => {
  try {
   const saved = JSON.parse(localStorage.getItem(POS_KEY));
   if (saved && typeof saved.top === 'number' && typeof saved.left === 'number') {
    return {
     top: Math.max(8, Math.min(window.innerHeight - 72, saved.top)),
     left: Math.max(8, Math.min(window.innerWidth - 72, saved.left)),
    };
   }
  } catch { /* ignore */ }
  return defaultPos();
 });
 const draggingRef = useRef(false);

 const savePos = (info) => {
  const next = {
   top: Math.max(8, Math.min(window.innerHeight - 72, info.point.y - 28)),
   left: Math.max(8, Math.min(window.innerWidth - 72, info.point.x - 28)),
  };
  setPos(next);
  try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
 };

 // Re-clamp on resize so the button/panel never escapes the viewport.
 useEffect(() => {
  const handleResize = () => {
   setPos(p => ({
    top: Math.max(8, Math.min(window.innerHeight - 72, p.top)),
    left: Math.max(8, Math.min(window.innerWidth - 72, p.left)),
   }));
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
 }, []);

 const hasDocuments = !!project.document_url;
 const welcome = hasDocuments
  ? `שלום! אני עוזר ה-AI של פרויקט "${project.client_name || project.name}". אני מבוסס על מסמכי הפרויקט המצורפים. שאל אותי כל שאלה — אציין מאיזה עמוד/סעיף לקוח המידע.`
  : `שלום! אין מסמך מצורף לפרויקט זה. העלה מסמך פרויקט כדי שאוכל לענות על שאלות.`;

 // All conversations for this project (for the history panel)
 const { data: conversations = [] } = useQuery({
  queryKey: ['chatConversations', projectId],
  queryFn: () => api.entities.ChatConversation.filter({ project_id: projectId }, '-updated_date'),
  enabled: !!projectId && open,
 });

 // Active conversation messages
 const { data: savedConv } = useQuery({
  queryKey: ['chatConversation', projectId, convId],
  queryFn: () => convId ? api.entities.ChatConversation.get(convId) : null,
  enabled: !!projectId && !!convId,
 });

 // On first open with no active conversation, auto-select the most recent one.
 // Skip if the user just clicked "New Chat".
 useEffect(() => {
  if (open && !convId && conversations.length > 0 && !newChatRef.current) {
   setConvId(conversations[0].id);
  }
 }, [open, convId, conversations]);

 useEffect(() => {
  if (savedConv) {
   setMessages(savedConv.messages?.length ? savedConv.messages : [{ role: 'assistant', content: welcome }]);
  } else if (!convId) {
   setMessages([{ role: 'assistant', content: welcome }]);
  }
 }, [savedConv, convId]); 

 useEffect(() => {
  if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages, loading, open]);

 // Warmup: send a lightweight call to keep the function hot — eliminates cold start
 useEffect(() => {
  if (open && hasDocuments) {
   api.functions.invoke('projectChat', { warmup: true }).catch(() => {});
  }
 }, [open, hasDocuments]);

 const persist = async (msgs, targetConvId = convId) => {
  const real = msgs.filter((_, i) => !(i === 0 && msgs[0]?.role === 'assistant' && msgs.length === 1));
  if (real.length === 0) return;
  const title = msgs.find(m => m.role === 'user')?.content?.slice(0, 60) || 'שיחה';
  if (targetConvId) {
   await api.entities.ChatConversation.update(targetConvId, { messages: msgs, title });
  } else {
   const created = await api.entities.ChatConversation.create({ project_id: projectId, title, messages: msgs });
   setConvId(created.id);
  }
  queryClient.invalidateQueries({ queryKey: ['chatConversations', projectId] });
 };

 const startNewChat = () => {
  newChatRef.current = true;
  setConvId(null);
  setMessages([{ role: 'assistant', content: welcome }]);
  setShowHistory(false);
 };

 const selectConversation = (id) => {
  newChatRef.current = false;
  setConvId(id);
  setShowHistory(false);
 };

 const deleteConversation = async (id, e) => {
  e.stopPropagation();
  await api.entities.ChatConversation.delete(id);
  queryClient.invalidateQueries({ queryKey: ['chatConversations', projectId] });
  if (id === convId) startNewChat();
 };

 const sendMessage = async () => {
  if (!input.trim() || loading) return;
  const question = input.trim();
  const userMsg = { role: 'user', content: question };
  const newMessages = [...messages, userMsg];
  setMessages(newMessages);
  setInput('');

  if (!hasDocuments) {
   const finalMsgs = [...newMessages, { role: 'assistant', content: 'לא נמצא מסמך מצורף. אנא העלה מסמך פרויקט בסעיף "מסמכי הפרויקט".' }];
   setMessages(finalMsgs);
   persist(finalMsgs);
   return;
  }

  setLoading(true);
  try {
   const { data } = await api.functions.invoke('projectChat', {
    projectId,
    question,
    history: messages.slice(-4),
   });
   const answer = data?.answer || data?.error || 'אירעה שגיאה. נסה שוב.';
   const finalMsgs = [...newMessages, { role: 'assistant', content: answer }];
   setMessages(finalMsgs);
   persist(finalMsgs);
  } catch {
   const finalMsgs = [...newMessages, { role: 'assistant', content: 'אירעה שגיאה. נסה שוב.' }];
   setMessages(finalMsgs);
  } finally {
   setLoading(false);
  }
 };

 const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
 };

 // Clamp panel to viewport — never escapes screen boundaries.
 const panelW = 400;
 const panelH = 560;
 const w = Math.min(panelW, window.innerWidth - 24);
 const h = Math.min(panelH, window.innerHeight - 24);
 const clampedLeft = Math.max(12, Math.min(pos.left, window.innerWidth - w - 12));
 const clampedTop = Math.max(12, Math.min(pos.top, window.innerHeight - h - 12));

 if (!open) {
  return (
   <motion.button
    drag
    dragMomentum={false}
    onDragStart={() => { draggingRef.current = true; }}
    onDragEnd={(e, info) => { savePos(info); setTimeout(() => { draggingRef.current = false; }, 0); }}
    onClick={() => { if (!draggingRef.current) setOpen(true); }}
    whileHover={{ scale: 1.05 }}
    whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
    style={{ top: pos.top, left: pos.left }}
    className="ai-glow fixed w-14 h-14 rounded-full bg-primary shadow-lg flex flex-col items-center justify-center hover:bg-primary/90 z-40 gap-0.5 cursor-grab touch-none"
    title="AI צ'אט - גרור כדי להזיז · לחץ כדי לפתוח"
   >
    <Bot className="w-6 h-6 text-primary-foreground"/>
    <span className="text-primary-foreground text-[9px] font-bold leading-none">AI</span>
   </motion.button>
  );
 }

 return (
  <AnimatePresence>
   <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    transition={{ duration: 0.2 }}
    className="fixed z-50 bottom-4 left-3 right-3 top-auto h-[560px] max-h-[calc(100dvh-2rem)] sm:left-4 sm:right-auto sm:w-[400px] bg-card rounded-xl shadow-xl border border-border flex flex-col overflow-hidden"
    dir="rtl"
   >
    {/* Header */}
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-accent flex-shrink-0">
     <div className="flex items-center gap-1.5">
      <button onClick={() => setShowHistory(s => !s)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${showHistory ? 'bg-accent text-primary' : 'hover:bg-muted text-muted-foreground'}`} title="היסטוריית שיחות">
       <History className="w-4 h-4"/>
      </button>
      <div className="flex items-center gap-2">
       <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-primary-foreground"/>
       </div>
       <div>
        <p className="text-xs font-bold text-foreground leading-none">Project Agent</p>
        <div className="flex items-center gap-1 mt-0.5">
         {hasDocuments ? (
          <>
           <FileText className="w-2.5 h-2.5 text-primary"/>
           <p className="text-[9px] text-primary font-medium">מסמך מצורף</p>
          </>
         ) : (
          <>
           <AlertCircle className="w-2.5 h-2.5 text-warning"/>
           <p className="text-[9px] text-warning font-medium">אין מסמך</p>
          </>
         )}
        </div>
       </div>
      </div>
     </div>
     <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
      <X className="w-3.5 h-3.5 text-muted-foreground"/>
     </button>
    </div>

    {/* History panel */}
    <AnimatePresence>
     {showHistory && (
      <motion.div
       initial={{ height: 0, opacity: 0 }}
       animate={{ height: 'auto', opacity: 1 }}
       exit={{ height: 0, opacity: 0 }}
       transition={{ duration: 0.2 }}
       className="overflow-hidden border-b border-border bg-muted/30"
      >
       <div className="p-2 space-y-1 max-h-52 overflow-y-auto">
        <button onClick={startNewChat} className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-accent transition-colors">
         <Plus className="w-3.5 h-3.5"/>
         שיחה חדשה
        </button>
        {conversations.length === 0 ? (
         <p className="text-[11px] text-muted-foreground text-center py-3">אין שיחות קודמות</p>
        ) : (
         conversations.map(c => (
          <div
           key={c.id}
           onClick={() => selectConversation(c.id)}
           className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors group ${c.id === convId ? 'bg-accent' : 'hover:bg-muted'}`}
          >
           <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${c.id === convId ? 'text-primary' : 'text-muted-foreground'}`} />
           <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${c.id === convId ? 'text-primary' : 'text-foreground'}`}>{c.title || 'שיחה'}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(c.updated_date, 'datetime')}</p>
           </div>
           <button onClick={(e) => deleteConversation(c.id, e)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-all flex-shrink-0">
            <Trash2 className="w-3 h-3 text-destructive"/>
           </button>
          </div>
         ))
        )}
       </div>
      </motion.div>
     )}
    </AnimatePresence>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
     {messages.map((msg, i) => (
      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
       <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
        msg.role === 'user'
         ? 'bg-primary text-primary-foreground rounded-tr-md'
         : 'bg-muted text-foreground rounded-tl-md'
       }`}>
        {msg.role === 'assistant' ? (
         <ReactMarkdown
          className="prose prose-xs max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-1.5 [&_strong]:font-semibold [&_ul]:me-3 [&_li]:mb-0.5"
         >
          {msg.content}
         </ReactMarkdown>
        ) : (
         msg.content
        )}
       </div>
      </div>
     ))}
     {loading && (
      <div className="flex justify-end">
       <div className="bg-muted rounded-lg rounded-tl-md px-3 py-2.5 flex items-center gap-2">
        <TypingIndicator className="text-muted-foreground"/>
        <span className="text-xs text-muted-foreground">מנתח...</span>
       </div>
      </div>
     )}
     <div ref={bottomRef} />
    </div>

    {/* Input */}
    <div className="px-3 py-2.5 border-t border-border flex-shrink-0">
     {!hasDocuments && (
      <p className="text-[10px] text-warning text-center mb-1.5 bg-warning-muted rounded-lg px-2 py-1">
       העלה מסמך פרויקט כדי להפעיל את ה-AI
      </p>
     )}
     <div className="flex gap-2">
      <Input
       value={input}
       onChange={(e) => setInput(e.target.value)}
       onKeyDown={handleKeyDown}
       placeholder="שאל שאלה על המסמך..."
       className="h-8 rounded-full text-xs flex-1 border-border"
       disabled={loading}
       dir="rtl"
      />
      <Button
        size="icon"
        aria-label="שלח הודעה"
        onClick={sendMessage}
        disabled={!input.trim() || loading}
        className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 shadow-none"
      >
       <Send className="w-3.5 h-3.5"/>
      </Button>
     </div>
    </div>
   </motion.div>
  </AnimatePresence>
 );
}