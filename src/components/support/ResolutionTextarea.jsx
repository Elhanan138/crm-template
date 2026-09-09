import React, { useRef, useState } from 'react';
import { api } from '@/api/client';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Textarea with embedded screenshot upload — paste support + attach button,
 * thumbnails rendered inside the textarea frame.
 */
export default function ResolutionTextarea({
  value,
  onChange,
  images = [],
  onImagesChange,
  placeholder,
  className = '',
  textareaRef,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        onImagesChange(prev => [...prev, file_url]);
      }
    } catch {
      toast.error('העלאת התמונה נכשלה');
    }
    setUploading(false);
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    e.target.value = '';
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    setUploading(true);
    try {
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        onImagesChange(prev => [...prev, file_url]);
      }
      toast.success('צילום מסך הודבק', { duration: 2000 });
    } catch {
      toast.error('העלאת צילום המסך נכשלה');
    }
    setUploading(false);
  };

  const removeImage = (idx) => onImagesChange(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className={`relative rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring overflow-hidden ${className}`}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="min-h-[80px] text-sm resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
      />
      {/* Inline thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          {images.map((url, i) => (
            <div key={i} className="relative w-14 h-14 rounded-md overflow-hidden border border-border group">
              <img src={url} alt={`צרופה ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 end-0.5 w-4 h-4 rounded-full bg-foreground/60 text-background flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Toolbar inside textarea */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/30">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {uploading ? 'מעלה...' : 'צרף צילום מסך'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      </div>
    </div>
  );
}