import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Send, Loader2, Clock, Database, Zap, FileText, Cpu, Gauge } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TypingIndicator from '@/components/shared/TypingIndicator';

const SOURCE_META = {
  cache: { label: 'מטמון', icon: Zap, tone: 'text-info' },
  saved_qa: { label: 'מוגדר מראש', icon: Database, tone: 'text-primary' },
  predefined: { label: 'מוגדר מראש', icon: Database, tone: 'text-primary' },
  llm_doc: { label: 'ממסמך מעובד', icon: FileText, tone: 'text-success' },
  llm_test: { label: 'בדיקת מודל', icon: Gauge, tone: 'text-warning' },
  llm_fallback: { label: 'ממסמך (fallback)', icon: FileText, tone: 'text-warning' },
  llm_no_doc: { label: 'ללא מסמך', icon: FileText, tone: 'text-muted-foreground' },
  processing: { label: 'בעיבוד', icon: Clock, tone: 'text-warning' },
};

const MODEL_OPTIONS = [
  { value: 'gemini_3_flash', label: 'Gemini 3 Flash (ברירת מחדל)' },
  { value: 'gemini_3_1_pro', label: 'Gemini 3.1 Pro' },
  { value: 'gpt_5_mini', label: 'GPT-5 Mini' },
  { value: 'gpt_5_4', label: 'GPT-5.4' },
  { value: 'gpt_5_5', label: 'GPT-5.5' },
  { value: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6' },
  { value: 'claude_opus_4_6', label: 'Claude Opus 4.6' },
  { value: 'claude_opus_4_7', label: 'Claude Opus 4.7' },
  { value: 'claude_opus_4_8', label: 'Claude Opus 4.8' },
  { value: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
];

export default function TestQuestionSection({ projectId }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini_3_flash');

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setLoading(true);
    setResult(null);
    const start = Date.now();
    try {
      const { data } = await api.functions.invoke('projectChat', {
        projectId,
        question: q,
        history: [],
        skip_saved: false,
        test_model: selectedModel,
      });
      const elapsed = Date.now() - start;
      const answer = data?.answer || data?.error || 'לא התקבלה תשובה.';
      const source = data?.source || 'unknown';
      const llmTime = data?.llm_time_ms ?? null;
      const model = data?.model || selectedModel;
      setResult({ question: q, answer, source, elapsed, llmTime, model });
    } catch (e) {
      const elapsed = Date.now() - start;
      setResult({ question: q, answer: `שגיאה: ${e?.response?.data?.error || e?.message || 'אירעה שגיאה'}`, source: 'error', elapsed, llmTime: null, model: selectedModel });
    } finally {
      setLoading(false);
    }
  };

  const sourceMeta = result ? SOURCE_META[result.source] || { label: result.source, icon: FileText, tone: 'text-muted-foreground' } : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Send className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">בדיקת שאלה</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">מודל לבדיקה</span>
        </div>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="h-9 rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
          placeholder="בדוק שאלה על המסמך..."
          className="h-9 rounded-lg text-sm"
          disabled={loading}
        />
        <Button onClick={handleAsk} disabled={loading || !question.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 w-9 p-0 flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent rounded-lg px-3 py-2.5">
          <TypingIndicator className="text-primary" />
          <span>מחפש במסמכים...</span>
        </div>
      )}

      {result && !loading && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {sourceMeta && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${sourceMeta.tone}`}>
                <sourceMeta.icon className="w-3 h-3" />
                {sourceMeta.label}
              </span>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {result.llmTime != null && (
                <span className="inline-flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  LLM: {result.llmTime}ms
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                סה"כ: {result.elapsed}ms
              </span>
            </div>
          </div>
          <ReactMarkdown className="text-xs prose prose-sm max-w-none text-foreground leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-1">
            {result.answer}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}