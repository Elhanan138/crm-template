import { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, Bot, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';
import TypingIndicator from '@/components/shared/TypingIndicator';

const POS_KEY = 'reportsAIChatBtnPos';
const COLORS = ['hsl(150 88% 28%)', 'hsl(205 85% 45%)', 'hsl(38 92% 45%)', 'hsl(280 65% 55%)', 'hsl(340 75% 55%)', 'hsl(215 16% 47%)'];

const SUGGESTIONS = [
 'מהו מצב הפרויקטים שלנו?',
 'סכם את מצב פניות התמיכה',
 'פילוח משימות לפי סטטוס',
 'כמה הצעות מחיר פתוחות יש?',
];

export default function ReportsAIChat() {
 const [open, setOpen] = useState(false);
 const [messages, setMessages] = useState([]);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const bottomRef = useRef(null);

 const defaultPos = () => ({ top: window.innerHeight - 88, left: 20 });
 const [pos, setPos] = useState(() => {
  try {
   const saved = JSON.parse(localStorage.getItem(POS_KEY));
   if (saved && typeof saved.top === 'number') {
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

 useEffect(() => {
  if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages, loading, open]);

 // Warmup: keep reportsChat function hot — eliminates cold start
 useEffect(() => {
  if (open) {
   api.functions.invoke('reportsChat', { warmup: true }).catch(() => {});
  }
 }, [open]);

 const send = async (text) => {
  if (!text.trim() || loading) return;
  setMessages(prev => [...prev, { role: 'user', content: text }]);
  setInput('');
  setLoading(true);

  try {
   const { data: result } = await api.functions.invoke('reportsChat', { question: text });
   setMessages(prev => [...prev, { role: 'assistant', content: result }]);
  } catch {
   setMessages(prev => [...prev, { role: 'assistant', content: { title: 'שגיאה', summary: 'אירעה שגיאה ביצירת הדוח. נסה שוב.', charts: [] } }]);
  } finally {
   setLoading(false);
  }
 };

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
    title="AI דוחות - גרור כדי להזיז · לחץ כדי לפתוח"
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
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-accent flex-shrink-0">
     <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
       <Bot className="w-3.5 h-3.5 text-primary-foreground"/>
      </div>
      <div>
       <p className="text-xs font-bold text-foreground leading-none">Report Agent</p>
       <p className="text-[9px] text-primary font-medium mt-0.5">ניתוח נתונים חכם</p>
      </div>
     </div>
     <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
      <X className="w-3.5 h-3.5 text-muted-foreground"/>
     </button>
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-muted/20">
     {messages.length === 0 && !loading && (
      <div className="text-center py-10">
       <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
        <Sparkles className="w-5 h-5 text-primary"/>
       </div>
       <p className="text-sm text-muted-foreground mb-3">בקש דוח מותאם אישית מה-AI</p>
       <div className="flex flex-wrap gap-2 justify-center max-w-xs mx-auto px-2">
        {SUGGESTIONS.map(s => (
         <button
          key={s}
          onClick={() => send(s)}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-card hover:bg-accent hover:text-primary transition-colors border border-border"
         >
          {s}
         </button>
        ))}
       </div>
      </div>
     )}

     {messages.map((msg, i) => (
      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
       <div className={`max-w-[92%] sm:max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
        msg.role === 'user'
         ? 'bg-primary text-primary-foreground rounded-tr-md'
         : 'bg-card text-foreground rounded-tl-md border border-border shadow-sm'
       }`}>
        {msg.role === 'assistant' ? (
         <>
          {msg.content?.title && <h4 className="text-xs font-bold mb-1">{msg.content.title}</h4>}
          {msg.content?.summary && (
           <ReactMarkdown className="prose prose-xs max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-1.5 [&_strong]:font-semibold [&_ul]:me-3 [&_li]:mb-0.5">
            {msg.content.summary}
           </ReactMarkdown>
          )}
          {msg.content?.charts?.map((chart, ci) => (
           <div key={ci} className="mt-3 bg-muted/30 rounded-lg p-2">
            <p className="text-[11px] font-semibold mb-2">{chart.title}</p>
            <ResponsiveContainer width="100%"height={150}>
             {chart.type === 'bar' ? (
              <BarChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
               <XAxis dataKey="name"tick={{ fontSize: 9 }} />
               <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
               <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
               <Bar dataKey="value"radius={[3, 3, 0, 0]}>
                {chart.data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
               </Bar>
              </BarChart>
             ) : (
              <PieChart>
               <Pie data={chart.data} dataKey="value"nameKey="name"cx="50%"cy="50%"outerRadius={50} innerRadius={28} paddingAngle={2}>
                {chart.data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
               </Pie>
               <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              </PieChart>
             )}
            </ResponsiveContainer>
           </div>
          ))}
         </>
        ) : msg.content}
       </div>
      </div>
     ))}

     {loading && (
      <div className="flex justify-end">
       <div className="bg-card rounded-lg rounded-tl-md px-3 py-2.5 flex items-center gap-2 border border-border shadow-sm">
        <TypingIndicator className="text-primary"/>
        <span className="text-caption">מנתח...</span>
       </div>
      </div>
     )}
     <div ref={bottomRef} />
    </div>

    <div className="px-3 py-2.5 border-t border-border flex-shrink-0 bg-background">
     <div className="flex gap-2">
      <Input
       value={input}
       onChange={e => setInput(e.target.value)}
       onKeyDown={e => { if (e.key === 'Enter') send(input); }}
       placeholder="בקש דוח מותאם..."
       className="flex-1 rounded-full text-xs h-9"
       disabled={loading}
       dir="rtl"
      />
      <Button
       onClick={() => send(input)}
       disabled={loading || !input.trim()}
       className="rounded-full h-9 w-9 p-0 bg-primary hover:bg-primary/90 flex-shrink-0"
      >
       <Send className="w-3.5 h-3.5"/>
      </Button>
     </div>
    </div>
   </motion.div>
  </AnimatePresence>
 );
}