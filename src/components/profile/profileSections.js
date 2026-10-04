import { User, BarChart3, Shield, Plug, Mail } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/features';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';

const ALL_PROFILE_SECTIONS = [
  { id: 'profile', label: 'פרטים אישיים', icon: User },
  { id: 'reports', label: 'הדוחות שלי', icon: BarChart3, module: 'reports' },
  { id: 'integrations', label: 'אינטגרציות', icon: Plug },
  { id: 'outbox', label: 'מעקב מיילים', icon: Mail, adminOnly: true, feature: 'email-tracking' },
  { id: 'permissions', label: 'הרשאות', icon: Shield },
];

export const PROFILE_SECTIONS = ALL_PROFILE_SECTIONS.filter(
  (s) => (!s.feature || isFeatureEnabled(s.feature)) && (!s.module || ACTIVE_MODULE_IDS.includes(s.module))
);