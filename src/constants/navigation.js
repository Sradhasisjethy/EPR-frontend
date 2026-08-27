import {
  LayoutDashboard,
  ShieldCheck,
  Library,
  ShoppingCart,
  Truck,
  Factory,
  Warehouse,
  HardHat,
  Users,
  Wallet,
  FileBarChart,
  Bell,
  History,
  FolderOpen,
  Settings,
  Gauge,
} from 'lucide-react';
import { WebPermissions } from './enums';

/**
 * Sidebar information architecture.
 *
 * Top level is a small set of modules; the leaves live one level down. Several
 * leaves deep-link into a tab of a shared page (`/returns?tab=credit-notes`) —
 * see hooks/use-tab-param.js, which is what makes those tabs addressable.
 *
 * Item shape:
 *   title       label in the sidebar
 *   href        route (omit for a group)
 *   children    leaves of a group
 *   permission  optional gate; items without one are always visible, and a group
 *               disappears once every one of its children is hidden
 *   soon        true for a screen that does not exist yet — rendered disabled
 *               rather than as a link that goes nowhere
 *   alias       this leaf borrows a route another leaf owns. It still links and
 *               highlights normally; it just doesn't get to name the page in the
 *               header breadcrumb (see lib/nav-match.js)
 */
export const NAVIGATION = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'Insights',
    icon: Gauge,
    href: '/analytics',
    permission: WebPermissions.ANALYTICS_READ,
  },
  {
    title: 'Administration',
    icon: ShieldCheck,
    href: '/administration',
  },
  {
    title: 'Masters',
    icon: Library,
    href: '/masters',
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    href: '/sales',
  },
  {
    title: 'Purchase',
    icon: Truck,
    href: '/purchasing',
  },
  {
    title: 'Production',
    icon: Factory,
    href: '/production-module',
  },
  {
    title: 'Inventory',
    icon: Warehouse,
    href: '/inventory-module',
  },
  {
    title: 'Contractor & Labour',
    icon: HardHat,
    href: '/workforce',
  },
  {
    title: 'Finance',
    icon: Wallet,
    href: '/finance',
  },
  {
    title: 'Reports',
    icon: FileBarChart,
    href: '/reports',
  },
  {
    title: 'Notifications',
    icon: Bell,
    href: '/notifications',
  },
  {
    title: 'Audit & Activity',
    icon: History,
    href: '/audit-log',
    permission: WebPermissions.AUDIT_READ,
  },
  {
    title: 'Documents',
    icon: FolderOpen,
    href: '/reports/saved?tab=document-search',
    permission: WebPermissions.REPORT_READ,
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
    permission: WebPermissions.SETTINGS_READ,
  },
];
