import React, { useState } from 'react';
import { APP_IDENTITY } from '@/lib/appIdentity';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function PopupAIAssistant({ onGenerated }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error(t("כתוב תיאור ליצירת הפופאפ")); return; }
    setLoading(true);
    try {
      const res = await api.integrations.Core.InvokeLLM({
        prompt: `You are a professional Hebrew content writer for a B2B SaaS project-management platform${APP_IDENTITY.name ? ` called "${APP_IDENTITY.name}"` : ''}.
Generate a popup announcement in Hebrew based on this request: "${prompt}"

Requirements:
1. Return valid JSON with fields: title, content, layoutType, ctaLabel
2. Write in professional, warm Hebrew suitable for Israeli B2B/SaaS users
3. title: short, catchy (max 60 chars)
4. content: Hebrew body in markdown — use bullet points where appropriate
5. layoutType: "announcement", "changelog", or "alert" (choose best fit)
6. ctaLabel: short Hebrew CTA button label, or empty string`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            layoutType: { type: 'string', enum: ['announcement', 'changelog', 'alert'] },
            ctaLabel: { type: 'string' },
          },
        },
      });
      onGenerated(res);
      toast.success(t("התוכן נוצר — ניתן לערוך ולשמור"));
    } catch (e) {
      toast.error(t("יצירת התוכן נכשלה"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate(); }}
        placeholder={t("תאר את הפופאפ שתרצה ליצור...")}
        className="h-9 rounded-lg flex-1"
      />
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-4 text-sm gap-2 flex-shrink-0"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        צור עם AI
      </Button>
    </div>
  );
}