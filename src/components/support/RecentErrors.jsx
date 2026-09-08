import React, { useState } from 'react';
import { AlertOctagon, Copy, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getRecentErrors, clearRecentErrors, copyToClipboard } from '@/lib/errorCapture';
import { getErrorInfo } from '@/lib/errors';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatDate';

/**
 * Collapsible section showing the last 20 errors captured on this device
 * during the current session. Visible to all users (no admin required).
 */
export default function RecentErrors() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState(() => getRecentErrors());
  const [copiedAll, setCopiedAll] = useState(false);

  const refresh = () => setErrors(getRecentErrors());

  const handleCopyOne = async (report) => {
    const ok = await copyToClipboard(report);
    if (ok) toast.success('הדוח הועתק ללוח');
    else toast.error('לא ניתן היה להעתיק');
  };

  const handleCopyAll = async () => {
    const all = errors.map(e => e.report).join('\n\n---\n\n');
    const ok = await copyToClipboard(all);
    if (ok) {
      setCopiedAll(true);
      toast.success('כל הדוחות הועתקו ללוח');
      setTimeout(() => setCopiedAll(false), 2500);
    } else toast.error('לא ניתן היה להעתיק');
  };

  const handleClear = () => {
    clearRecentErrors();
    refresh();
    toast.success('רשימת השגיאות נוקתה');
  };

  if (!errors.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">שגיאות אחרונות במכשיר שלי</p>
                <p className="text-caption">{errors.length} שגיאות נשמרו בסשן הנוכחי</p>
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="flex items-center justify-end gap-2 p-3 bg-muted/30">
              <Button onClick={handleCopyAll} variant="outline" size="sm" className="h-7 rounded-full text-xs gap-1.5">
                {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                העתק הכל
              </Button>
              <Button onClick={handleClear} variant="ghost" size="sm" className="h-7 rounded-full text-xs gap-1.5 text-muted-foreground">
                <Trash2 className="w-3 h-3" />
                נקה
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {errors.map((e, i) => {
                const info = getErrorInfo(e.code);
                const time = formatDate(e.timestamp, 'datetime');
                return (
                  <div key={i} className="p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{info.title}</span>
                        <code dir="ltr" className="text-[10px] font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{e.code}</code>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5" dir="ltr">{e.route}</p>
                      <p className="text-[11px] text-muted-foreground">{time}{e.operation ? ` · ${e.operation}` : ''}{e.entity_or_function ? ` · ${e.entity_or_function}` : ''}</p>
                    </div>
                    <Button
                      onClick={() => handleCopyOne(e.report)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}