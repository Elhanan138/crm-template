import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import confetti from 'canvas-confetti';
import { CheckCircle2, CircleAlert, Loader2, Sparkles, Zap } from 'lucide-react';

const LOTTIE_LOADING_URL = 'https://assets9.lottiefiles.com/packages/lf20_yfsb3a03.json';
const LOTTIE_SUCCESS_URL = 'https://assets9.lottiefiles.com/packages/lf20_jbrw3hcz.json';

function useLottieAnimation(url) {
 const [data, setData] = useState(null);
 useEffect(() => {
  let cancelled = false;
  fetch(url)
   .then(r => r.json())
   .then(d => { if (!cancelled) setData(d); })
   .catch(() => {});
  return () => { cancelled = true; };
 }, [url]);
 return data;
}

function LoadingAnimation() {
 const animationData = useLottieAnimation(LOTTIE_LOADING_URL);
 if (animationData) {
  return <Lottie animationData={animationData} loop autoplay style={{ width: 120, height: 120 }} />;
 }
 return (
  <motion.div
   animate={{ rotate: 360 }}
   transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
   className="w-16 h-16 rounded-full border-4 border-accent border-t-primary"
  />
 );
}

function SuccessAnimation() {
 const animationData = useLottieAnimation(LOTTIE_SUCCESS_URL);
 if (animationData) {
  return <Lottie animationData={animationData} loop={false} autoplay style={{ width: 120, height: 120 }} />;
 }
 return (
  <motion.div
   initial={{ scale: 0 }}
   animate={{ scale: 1 }}
   transition={{ type: 'spring', damping: 12, stiffness: 200 }}
   className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
  >
   <CheckCircle2 className="w-10 h-10 text-success"/>
  </motion.div>
 );
}

function fireConfetti() {
 const duration = 2500;
 const end = Date.now() + duration;
 const colors = ['hsl(150, 84%, 30%)', 'hsl(205, 85%, 45%)', 'hsl(38, 92%, 45%)', 'hsl(340, 75%, 55%)'];
 (function frame() {
  confetti({ particleCount: 4, angle: 60, spread: 65, origin: { x: 0, y: 0.7 }, colors });
  confetti({ particleCount: 4, angle: 120, spread: 65, origin: { x: 1, y: 0.7 }, colors });
  if (Date.now() < end) requestAnimationFrame(frame);
 })();
 confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors, startVelocity: 35 });
}

function OperationStep({ op, index, status }) {
 const isDone = status === 'done';
 const isRunning = status === 'running';
 return (
  <motion.div
   initial={{ opacity: 0, x: -16 }}
   animate={{ opacity: 1, x: 0 }}
   transition={{ delay: index * 0.12, type: 'spring', damping: 20 }}
   className="flex items-center gap-2.5 text-xs"
  >
   <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
    {isDone ? (
     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
      <CheckCircle2 className="w-3.5 h-3.5 text-success"/>
     </motion.div>
    ) : isRunning ? (
     <Loader2 className="w-3.5 h-3.5 animate-spin text-primary"/>
    ) : (
     <div className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/30"/>
    )}
   </div>
   <span className={isDone ? 'text-muted-foreground line-through' : 'text-foreground'}>
    {op.label}
   </span>
  </motion.div>
 );
}

export default function ActionExecutionOverlay({ visible, status, actionLabel, operations }) {
 const [stepStatuses, setStepStatuses] = useState([]);

 useEffect(() => {
  if (!visible || status !== 'executing' || !operations?.length) return;
  setStepStatuses(operations.map(() => 'pending'));
  let i = 0;
  const interval = setInterval(() => {
   setStepStatuses(prev => {
    const next = [...prev];
    if (i < next.length) {
     next[i] = 'running';
     if (i > 0) next[i - 1] = 'done';
    }
    return next;
   });
   if (i >= operations.length) clearInterval(interval);
   i++;
  }, 600);
  return () => clearInterval(interval);
 }, [visible, status, operations]);

 useEffect(() => {
  if (status === 'success') {
   setStepStatuses(prev => prev.map(() => 'done'));
   fireConfetti();
  }
 }, [status]);

 if (!visible) return null;

 return createPortal(
  <AnimatePresence>
   {visible && (
    <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
     className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
    >
     <motion.div
      initial={{ scale: 0.85, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.9, y: 16, opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-sm flex flex-col items-center gap-4"
     >
      <div className="relative">
       <AnimatePresence mode="wait">
        {status === 'executing' && (
         <motion.div key="loading"exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
          <LoadingAnimation />
         </motion.div>
        )}
        {status === 'success' && (
         <motion.div key="success"initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <SuccessAnimation />
         </motion.div>
        )}
        {status === 'error' && (
         <motion.div key="error"initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
           <CircleAlert className="w-10 h-10 text-destructive"/>
          </div>
         </motion.div>
        )}
       </AnimatePresence>
      </div>

      <div className="text-center">
       {status === 'executing' && (
        <p className="text-sm font-bold text-foreground flex items-center gap-1.5 justify-center">
         <Zap className="w-3.5 h-3.5 text-primary"/>
         {actionLabel || 'מבצע פעולה...'}
        </p>
       )}
       {status === 'success' && (
        <motion.p
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         className="text-sm font-bold text-success flex items-center gap-1.5 justify-center"
        >
         <Sparkles className="w-3.5 h-3.5"/>
         הפעולה בוצעה בהצלחה!
        </motion.p>
       )}
       {status === 'error' && (
        <p className="text-sm font-bold text-destructive">הפעולה נכשלה</p>
       )}
      </div>

      {status === 'executing' && operations?.length > 0 && (
       <div className="w-full space-y-2 pt-1">
        {operations.map((op, i) => (
         <OperationStep key={i} op={op} index={i} status={stepStatuses[i] || 'pending'} />
        ))}
       </div>
      )}
     </motion.div>
    </motion.div>
   )}
  </AnimatePresence>,
  document.body
 );
}