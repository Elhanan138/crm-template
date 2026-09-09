import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatDate';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { label: 'מעבד...', tone: 'warning' },
  ready: { label: 'מוכן', tone: 'success' },
  failed: { label: 'נכשל', tone: 'destructive' },
};

export default function DocumentStatusSection({ projectId }) {
  const queryClient = useQueryClient();
  const [reprocessingId, setReprocessingId] = useState(null);
  const pollRef = useRef(null);

  const { data: docTexts = [], isLoading } = useQuery({
    queryKey: ['projectDocTexts', projectId],
    queryFn: () => api.entities.ProjectDocumentText.filter({ project_id: projectId }, '-extracted_at'),
    enabled: !!projectId,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const hasPending = docTexts.some(d => d.status === 'pending');

  // Poll for progress updates while any document is pending
  useEffect(() => {
    if (!hasPending) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['projectDocTexts', projectId] });
    }, 5000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [hasPending, projectId, queryClient]);

  const handleReprocess = async (docUrl) => {
    setReprocessingId(docUrl);
    // Fire and forget — progress polling will track real status
    api.functions.invoke('ingestProjectDocument', { projectId, docUrl })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['projectDocTexts', projectId] });
        toast.success('המסמך עובד מחדש בהצלחה');
      })
      .catch(() => toast.error('עיבוד מחדש נכשל'))
      .finally(() => setReprocessingId(null));
    // Immediate refresh so pending status + progress shows right away
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['projectDocTexts', projectId] }), 500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">סטטוס מסמכים</span>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> טוען...
        </div>
      ) : docTexts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">אין מסמכים מעובדים. העלה מסמכים מתוך פרטי הפרויקט.</p>
      ) : (
        <div className="space-y-2">
          {docTexts.map(doc => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const isReprocessing = reprocessingId === doc.doc_url;
            const isPending = doc.status === 'pending';
            const progress = typeof doc.progress === 'number' ? doc.progress : (isPending ? 0 : 100);
            return (
              <div key={doc.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{doc.doc_name || 'מסמך'}</p>
                    {doc.extracted_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">חולץ: {formatDate(doc.extracted_at, 'medium')}</p>
                    )}
                  </div>
                  <StatusBadge label={cfg.label} tone={cfg.tone} className="flex-shrink-0" />
                </div>

                {isPending && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground truncate">
                        {doc.progress_stage || 'מעבד...'}
                      </span>
                      <span className="text-[10px] font-semibold text-primary flex-shrink-0 tabular-nums">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReprocess(doc.doc_url)}
                  disabled={isReprocessing || isPending}
                  className="mt-2 h-7 px-2.5 text-[11px] gap-1 text-muted-foreground hover:text-primary"
                >
                  {isReprocessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  עבד מחדש
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}