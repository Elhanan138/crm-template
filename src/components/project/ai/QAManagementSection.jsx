import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, BookOpen, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function QAManagementSection({ projectId }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const { data: savedQAs = [], isLoading } = useQuery({
    queryKey: ['projectChatQuestions', projectId],
    queryFn: () => api.entities.ProjectChatQuestion.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId,
  });

  const openAdd = () => {
    setEditing(null);
    setQuestion('');
    setAnswer('');
    setSheetOpen(true);
  };

  const openEdit = (qa) => {
    setEditing(qa);
    setQuestion(qa.question || '');
    setAnswer(qa.answer || '');
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error('יש למלא שאלה ותשובה');
      return;
    }
    try {
      if (editing) {
        await api.entities.ProjectChatQuestion.update(editing.id, { question: question.trim(), answer: answer.trim() });
        toast.success('השאלה עודכנה');
      } else {
        await api.entities.ProjectChatQuestion.create({ project_id: projectId, question: question.trim(), answer: answer.trim() });
        toast.success('השאלה נוספה');
      }
      queryClient.invalidateQueries({ queryKey: ['projectChatQuestions', projectId] });
      setSheetOpen(false);
    } catch {
      toast.error('השמירה נכשלה');
    }
  };

  const handleDelete = (qa) => {
    const previous = queryClient.getQueryData(['projectChatQuestions', projectId]);
    queryClient.setQueryData(['projectChatQuestions', projectId], old => (old || []).filter(q => q.id !== qa.id));

    let undone = false;
    toast('השאלה נמחקה', {
      duration: 2500,
      action: {
        label: 'בטל',
        onClick: () => {
          undone = true;
          queryClient.setQueryData(['projectChatQuestions', projectId], previous);
          toast.success('המחיקה בוטלה');
        },
      },
    });

    setTimeout(() => {
      if (undone) return;
      api.entities.ProjectChatQuestion.delete(qa.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['projectChatQuestions', projectId] }))
        .catch(() => {
          queryClient.setQueryData(['projectChatQuestions', projectId], previous);
          toast.error('המחיקה נכשלה');
        });
    }, 2500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">שאלות ותשובות</span>
          {savedQAs.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{savedQAs.length}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={openAdd} className="h-7 px-2.5 text-[11px] gap-1 text-primary hover:bg-primary/10">
          <Plus className="w-3.5 h-3.5" /> הוסף
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">טוען...</p>
      ) : savedQAs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">אין שאלות שמורות עדיין.</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {savedQAs.map(qa => (
            <div key={qa.id} className="rounded-lg border border-border bg-muted/20 p-3 group">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs font-semibold text-foreground line-clamp-1 flex-1">{qa.question}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {qa.auto_cached && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-info bg-info-muted px-1.5 py-0.5 rounded-full">
                      <Zap className="w-2.5 h-2.5" /> מטמון
                    </span>
                  )}
                  <button onClick={() => openEdit(qa)} className="w-6 h-6 rounded-full hover:bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary" />
                  </button>
                  <button onClick={() => handleDelete(qa)} className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
              <ReactMarkdown className="text-xs prose prose-sm max-w-none text-foreground leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-1">
                {qa.answer}
              </ReactMarkdown>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md p-0" dir="rtl">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle>{editing ? 'עריכת שאלה' : 'שאלה חדשה'}</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">שאלה</label>
              <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="הקלד שאלה..." className="h-9 rounded-lg text-sm" dir="rtl" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">תשובה</label>
              <Textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="הקלד תשובה (תומך ב-Markdown)..." className="rounded-lg text-sm min-h-[160px]" dir="rtl" />
            </div>
          </div>
          <SheetFooter className="px-5 py-3 border-t border-border flex-row gap-2 justify-start">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm">
              שמור
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="rounded-full h-9 px-5 text-sm">
              ביטול
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}