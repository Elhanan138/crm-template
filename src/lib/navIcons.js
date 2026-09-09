import {
  HomeIcon, CubeIcon, CheckboxIcon, CalendarIcon, ReaderIcon,
  TargetIcon, Pencil1Icon, LayersIcon, ChatBubbleIcon, GearIcon,
  RocketIcon, SectionIcon, BellIcon,
} from '@radix-ui/react-icons';
import {
  Building2, BarChart3, Filter, Contact, TrendingUp, Receipt, Package, Route,
  Users, UserPlus, GraduationCap, Boxes, ShoppingCart, Laptop, Wrench,
  ShieldCheck, AlertTriangle, Repeat,
} from 'lucide-react';

/**
 * Single source of truth for navigation icons.
 * Used by the sidebar nav, page headers, and dashboard widgets
 * so the same page always shows the same icon everywhere.
 */
export const NAV_ICONS = {
  dashboard: HomeIcon,
  clients: Building2,
  projects: CubeIcon,
  proposals: ReaderIcon,
  notes: SectionIcon,
  tasks: CheckboxIcon,
  calendar: CalendarIcon,
  guides: ReaderIcon,
  forms: LayersIcon,
  leads: Filter,
  contacts: Contact,
  forecast: TrendingUp,
  invoices: Receipt,
  products: Package,
  automations: Route,
  employees: Users,
  recruiting: UserPlus,
  training: GraduationCap,
  inventory: Boxes,
  purchasing: ShoppingCart,
  assets: Laptop,
  maintenance: Wrench,
  compliance: ShieldCheck,
  risks: AlertTriangle,
  subscriptions: Repeat,
  reports: BarChart3,
  support: ChatBubbleIcon,
  settings: GearIcon,
  roadmap: RocketIcon,
  notifications: BellIcon,
};
