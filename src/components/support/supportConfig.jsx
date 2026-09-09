import { Bug, Lightbulb, Star, HelpCircle } from 'lucide-react';

export const TYPE_CONFIG = {
  bug:         { label: 'באג / תקלה',   icon: Bug,        color: 'text-destructive',    bg: 'bg-destructive/10',     border: 'border-destructive' },
  improvement: { label: 'הצעה לשיפור',  icon: Lightbulb,  color: 'text-warning',  bg: 'bg-warning-muted',   border: 'border-warning' },
  feature:     { label: 'פיצ׳ר חדש',    icon: Star,       color: 'text-info', bg: 'bg-info-muted',  border: 'border-info' },
  other:       { label: 'אחר',          icon: HelpCircle, color: 'text-muted-foreground',  bg: 'bg-muted',   border: 'border-border' },
};

export const PRIORITY_CONFIG = {
  high:   { label: 'גבוהה',  color: 'text-destructive',    bg: 'bg-destructive/10 border-destructive',       flag: 'bg-destructive' },
  medium: { label: 'בינונית', color: 'text-warning',  bg: 'bg-warning-muted border-warning',  flag: 'bg-warning' },
  low:    { label: 'נמוכה',  color: 'text-muted-foreground',  bg: 'bg-muted border-border',   flag: 'bg-muted-foreground' },
};