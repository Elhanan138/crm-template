import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useProjectPeople } from '@/hooks/useProjectPeople';

// Highlights @mentions in blue inside the textarea while typing, using an
// overlay technique: a styled div sits behind the transparent textarea and
// renders the same text with mentions colored. The caret stays visible.
export default function MentionInput({ value, onChange, placeholder, className, projectId }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  const projectPeople = useProjectPeople(projectId).filter(m => !m.is_client);
  // Fail-closed: when projectId is missing/invalid, suggest no one.
  const people = (typeof projectId === 'string' && projectId) ? projectPeople : [];

  const mentionNames = useMemo(
    () => people.map(m => m.name).filter(Boolean),
    [people]
  );

  const filtered = useMemo(() =>
    people.filter(m => m.name?.toLowerCase().includes(query.toLowerCase())),
    [people, query]
  );

  // Reset highlighted index whenever the filtered list changes
  useEffect(() => { setHighlightIdx(0); }, [filtered]);

  const handleChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    onChange(val);
    setCursorPos(pos);
    const textBeforeCursor = val.substring(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    // Show dropdown only if @ is the start of a word (preceded by space or start)
    const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : '';
    if (atIndex !== -1 && !textBeforeCursor.substring(atIndex).includes(' ') && (atIndex === 0 || /\s/.test(charBefore))) {
      setQuery(textBeforeCursor.substring(atIndex + 1));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const insertMention = (member) => {
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const before = value.substring(0, atIndex);
    const after = value.substring(cursorPos);
    const newVal = `${before}@${member.name} ${after}`;
    onChange(newVal);
    setShowDropdown(false);
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = atIndex + member.name.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showDropdown && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx(i => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx(i => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filtered[highlightIdx]);
        return;
      }
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  // Sync scroll position between textarea and overlay
  const handleScroll = () => {
    if (overlayRef.current && inputRef.current) {
      overlayRef.current.scrollTop = inputRef.current.scrollTop;
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  // Build the highlighted overlay HTML
  const renderHighlighted = () => {
    if (!value) return placeholder || '';
    const escaped = mentionNames.filter(Boolean).sort((a, b) => b.length - a.length);
    if (escaped.length === 0) return value;
    const pattern = new RegExp(`@(${escaped.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(value)) !== null) {
      if (match.index > lastIndex) parts.push(escapeHtml(value.substring(lastIndex, match.index)));
      parts.push(`<span class="text-info font-semibold">@${escapeHtml(match[1])}</span>`);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) parts.push(escapeHtml(value.substring(lastIndex)));
    return parts.join('');
  };

  return (
    <div className="relative">
      {/* Highlight overlay — sits behind the transparent textarea */}
      <div
        ref={overlayRef}
        className={`${className} absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words`}
        dangerouslySetInnerHTML={{ __html: renderHighlighted() }}
      />
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`${className} relative bg-transparent`}
        style={{ color: 'transparent', caretColor: 'hsl(var(--foreground))' }}
        rows={3}
      />
      {showDropdown && (
        <div className="absolute z-50 bottom-full mb-1 start-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px] max-h-[240px] overflow-y-auto">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium">תייג איש צוות</p>
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-center text-caption">אין הרשאות לתיוג</div>
          ) : (
            filtered.map((member, i) => (
              <button
                key={member.id}
                type="button"
                className={`w-full text-right px-3 py-2 text-sm transition-colors flex items-center gap-2 ${i === highlightIdx ? 'bg-muted/70' : 'hover:bg-muted/50'}`}
                onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">{member.name?.[0]}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm leading-none">{member.name}</p>
                  {member.role && <p className="text-[10px] text-muted-foreground mt-0.5">{member.role}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}