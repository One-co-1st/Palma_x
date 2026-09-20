import type { Permission, Role } from '@/lib/auth/rbac';
import { can } from '@/lib/auth/rbac';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Search,
  Activity,
  Scale,
  Trophy,
  Crown,
  ScrollText,
  UserCheck,
  ShieldCheck,
  Flag,
  Image,
  AlertOctagon,
  Gavel,
  Briefcase,
  Handshake,
  ClipboardList,
  Heart,
  Settings,
  FileText,
  Import,
  ToggleRight,
  Sparkles,
  BookOpen,
  Send,
  Layers,
  type LucideIcon,
} from 'lucide-react';

export type AdminLink = {
  href: string;
  label: string;
  permission: Permission;
  planned?: boolean;
  icon?: LucideIcon;
};

export type AdminGroup = { title: string; items: AdminLink[] };

export const MODERATION_NAV: AdminGroup[] = [
  {
    title: 'Queues',
    items: [
      { href: '/portal', label: 'Overview', permission: 'operations:view_dashboard', icon: LayoutDashboard },
      { href: '/portal/nominations', label: 'Nominations', permission: 'admin:review_nominations', icon: ScrollText },
      { href: '/portal/claims', label: 'Creator claims', permission: 'claims:review', icon: UserCheck },
      { href: '/portal/verification', label: 'Age verification', permission: 'verification:review_manual', icon: ShieldCheck },
      { href: '/portal/reports', label: 'Reports', permission: 'moderation:view_reports', icon: Flag },
      { href: '/portal/portraits', label: 'Portraits', permission: 'editorial:edit_creator', icon: Image },
      { href: '/portal/objections', label: 'Objections', permission: 'creators:view_records', icon: AlertOctagon },
    ],
  },
  {
    title: 'The record',
    items: [
      { href: '/portal/creators', label: 'Creators', permission: 'creators:view_records', icon: Users },
      { href: '/portal/creators/import', label: 'Import', permission: 'editorial:import_creators', icon: Import },
      { href: '/portal/sponsorships', label: 'Sponsor placements', permission: 'commercial:assign_placement', icon: Layers },
      { href: '/portal/kulture', label: 'Kulture', permission: 'kulture:manage_products', icon: Sparkles },
      { href: '/portal/features', label: 'Features', permission: 'commercial:manage_features', icon: ToggleRight },
      { href: '/portal/the-palma', label: 'THE PALMA', permission: 'honours:propose_the_palma', icon: Crown },
      { href: '/paroh', label: 'PaROH', permission: 'operations:view_dashboard', icon: BookOpen },
    ],
  },
];

export const ADMIN_NAV: AdminGroup[] = [
  {
    title: 'Command centre',
    items: [
      { href: '/admin', label: 'Overview', permission: 'admin:view_dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', permission: 'admin:view_analytics', icon: BarChart3 },
      { href: '/admin/audience', label: 'Audience', permission: 'admin:view_analytics', icon: Users },
      { href: '/admin/search', label: 'Search', permission: 'creators:view_records', icon: Search },
      { href: '/admin/activity', label: 'Activity', permission: 'admin:view_audit_log', icon: Activity },
    ],
  },
  {
    title: 'Awards',
    items: [
      { href: '/admin/judging', label: 'Judging', permission: 'admin:assign_judging', icon: Scale },
      { href: '/admin/selection', label: 'Finalists & winners', permission: 'admin:select_finalists', icon: Trophy },
      { href: '/admin/the-palma', label: 'THE PALMA', permission: 'honours:confer_the_palma', icon: Crown },
      { href: '/paroh', label: 'PaROH', permission: 'admin:view_dashboard', icon: BookOpen },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/portal/creators', label: 'Creators', permission: 'creators:view_records', icon: Users },
      { href: '/admin/users', label: 'Users & roles', permission: 'admin:manage_users', icon: UserCheck },
    ],
  },
  {
    title: 'Queues',
    items: [
      { href: '/portal/claims', label: 'Creator claims', permission: 'claims:review', icon: FileText },
      { href: '/portal/verification', label: 'Age verification', permission: 'verification:review_manual', icon: ShieldCheck },
      { href: '/portal/reports', label: 'Reports', permission: 'moderation:view_reports', icon: Flag },
      { href: '/portal/portraits', label: 'Portraits', permission: 'editorial:edit_creator', icon: Image },
      { href: '/portal/objections', label: 'Objections', permission: 'creators:view_records', icon: AlertOctagon },
    ],
  },
  {
    title: 'Enforcement',
    items: [{ href: '/admin/enforcement', label: 'Enforcement', permission: 'admin:enforce', icon: Gavel }],
  },
  {
    title: 'Communications',
    items: [
      { href: '/admin/communications', label: 'Mail & the Gazette', permission: 'admin:view_communications', icon: Send },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/admin/business', label: 'Commercial', permission: 'commercial:view', icon: Briefcase },
      { href: '/portal/sponsorships', label: 'Sponsor placements', permission: 'commercial:assign_placement', icon: Layers },
      { href: '/admin/sponsors', label: 'Sponsors & partners', permission: 'admin:manage_sponsors', icon: Handshake },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/audit', label: 'Audit log', permission: 'admin:view_audit_log', icon: ClipboardList },
      { href: '/admin/health', label: 'System health', permission: 'admin:manage_system', icon: Heart },
      { href: '/admin/settings', label: 'Settings', permission: 'admin:manage_system', icon: Settings },
      { href: '/admin/settings/features', label: 'Features & commercial', permission: 'commercial:manage_features', icon: ToggleRight },
    ],
  },
];

export function navFor(role: Role, nav: AdminGroup[] = ADMIN_NAV): AdminGroup[] {
  return nav
    .map((group) => ({
      title: group.title,
      items: group.items.filter((item) => can(role, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
