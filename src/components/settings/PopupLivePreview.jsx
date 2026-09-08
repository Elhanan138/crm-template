import React, { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import PopupContent from '@/components/shared/PopupContent';

export default function PopupLivePreview({ popup }) {
  const [device, setDevice] = useState('desktop');

  return (
    <div dir="rtl" className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => setDevice('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${device === 'desktop' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
        >
          <Monitor className="w-3.5 h-3.5" /> דסקטופ
        </button>
        <button
          onClick={() => setDevice('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${device === 'mobile' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
        >
          <Smartphone className="w-3.5 h-3.5" /> מובייל
        </button>
      </div>
      <div className={`mx-auto overflow-hidden rounded-lg border border-border shadow-sm bg-background transition-all ${device === 'desktop' ? 'w-full max-w-md' : 'w-[320px]'}`}>
        {!popup.title ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            התצפיה המקדימה תופיע כאן
          </div>
        ) : (
          <PopupContent popup={popup} />
        )}
      </div>
    </div>
  );
}