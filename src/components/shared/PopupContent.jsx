import React, { useState } from 'react';
import { Megaphone, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ReactMarkdown from 'react-markdown';

const LAYOUT_CONFIG = {
 announcement: {
  icon: Megaphone,
  iconColor: 'text-primary',
  iconBg: 'bg-accent',
  container: 'bg-card',
 },
 changelog: {
  icon: Sparkles,
  iconColor: 'text-info',
  iconBg: 'bg-info/10',
  container: 'bg-card',
 },
 alert: {
  icon: AlertTriangle,
  iconColor: 'text-warning',
  iconBg: 'bg-warning/15',
  container: 'bg-warning-muted/40',
 },
};

export default function PopupContent({ popup, onCTAClick, onDismissChange }) {
 const config = LAYOUT_CONFIG[popup.layoutType] || LAYOUT_CONFIG.announcement;
 const Icon = config.icon;
 const [dontShowAgain, setDontShowAgain] = useState(false);

 const handleCheckboxChange = (checked) => {
  setDontShowAgain(checked);
  onDismissChange?.(checked);
 };

 return (
  <div className={config.container}>
   {popup.mediaUrl && popup.layoutType !== 'alert' && (
    <div className="w-full h-36 sm:h-44 overflow-hidden bg-muted">
     <img src={popup.mediaUrl} alt=""className="w-full h-full object-cover"/>
    </div>
   )}
   <div className="p-5">
    <div className="flex items-start gap-3 mb-3">
     <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${config.iconColor}`} />
     </div>
     <div className="min-w-0 flex-1">
      <h2 className="text-lg font-bold text-foreground leading-tight text-start">{popup.title}</h2>
     </div>
    </div>

    {popup.content && (
     <div className="text-sm text-foreground leading-relaxed text-start prose-tight">
      <ReactMarkdown
       components={{
        p: ({ children }) => <p className="mb-2 text-start">{children}</p>,
        li: ({ children }) => <li className="text-start mb-1">{children}</li>,
        ul: ({ children }) => <ul className="list-disc pe-5 space-y-1 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pe-5 space-y-1 mb-2">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        a: ({ children, href }) => <a href={href} className="text-primary underline"target="_blank"rel="noopener noreferrer">{children}</a>,
       }}
      >
       {popup.content}
      </ReactMarkdown>
     </div>
    )}

    {popup.ctaLabel && (
     <div className="mt-4">
      <Button
       onClick={() => onCTAClick?.(popup)}
       className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-6 text-sm gap-2"
      >
       {popup.ctaLabel}
       <ArrowLeft className="w-4 h-4"/>
      </Button>
     </div>
    )}

    {popup.showDismissCheckbox && (
     <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
      <Checkbox
       checked={dontShowAgain}
       onCheckedChange={handleCheckboxChange}
      />
      <span className="text-caption">אל תציג שוב</span>
     </label>
    )}
   </div>
  </div>
 );
}