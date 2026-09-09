import {
  Clock, Calendar, User, Phone, Mail, Link as LinkIcon,
  DollarSign, MapPin, Building2, StickyNote, Activity, Hash, Tag,
} from 'lucide-react';

// Keyword → icon mapping (case-insensitive, matched on field label).
const KEYWORD_MAP = [
  { kw: ['שעות', 'בנק', 'שעה', 'hour'], icon: Clock },
  { kw: ['תאריך', 'דדליין', 'deadline', 'date'], icon: Calendar },
  { kw: ['אחראי', 'מנהל', 'איש קשר', 'ליאזון', 'מלווה', 'user', 'contact'], icon: User },
  { kw: ['טלפון', 'phone', 'טל'], icon: Phone },
  { kw: ['מייל', 'אימייל', 'mail', 'email'], icon: Mail },
  { kw: ['קישור', 'לינק', 'url', 'link'], icon: LinkIcon },
  { kw: ['מחיר', 'תשלום', 'עלות', 'price', 'cost', 'payment'], icon: DollarSign },
  { kw: ['מיקום', 'כתובת', 'location', 'address'], icon: MapPin },
  { kw: ['חברה', 'ארגון', 'company', 'org'], icon: Building2 },
  { kw: ['הערה', 'הערות', 'note', 'notes'], icon: StickyNote },
  { kw: ['סטטוס', 'status', 'מצב'], icon: Activity },
  { kw: ['מספר', 'כמות', 'number', 'count'], icon: Hash },
];

export function pickFieldIcon(label) {
  const lower = (label || '').toLowerCase();
  for (const { kw, icon } of KEYWORD_MAP) {
    if (kw.some(k => lower.includes(k))) return icon;
  }
  return Tag;
}

export default pickFieldIcon;