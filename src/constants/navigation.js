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
    anyPermissions: [
      WebPermissions.EMPLOYEE_READ,
      WebPermissions.ORG_READ,
      WebPermissions.ROLE_READ,
      WebPermissions.FACTORY_READ,
      WebPermissions.SETTINGS_MODIFY,
      WebPermissions.LEAVE_READ,
      WebPermissions.STAFF_ATTENDANCE_READ,
    ],
  },
  {
    title: 'Masters',
    icon: Library,
    href: '/masters',
    anyPermissions: [
      WebPermissions.PARTY_READ,
      WebPermissions.PRODUCT_READ,
      WebPermissions.PRICING_READ,
      WebPermissions.VEHICLE_READ,
    ],
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    href: '/sales',
    anyPermissions: [
      WebPermissions.SALES_READ,
      WebPermissions.LEAD_READ,
      WebPermissions.QUOTATION_READ,
      WebPermissions.CASH_REGISTER_READ,
      WebPermissions.DISPATCH_READ,
      WebPermissions.INVOICE_READ,
      WebPermissions.RETURN_READ,
    ],
  },
  {
    title: 'Purchase',
    icon: Truck,
    href: '/purchasing',
    anyPermissions: [
      WebPermissions.PURCHASE_READ,
      WebPermissions.PURCHASE_CREATE,
      WebPermissions.PURCHASE_APPROVE,
    ],
  },
  {
    title: 'Production',
    icon: Factory,
    href: '/production-module',
    anyPermissions: [
      WebPermissions.PRODUCTION_READ,
      WebPermissions.QUALITY_READ,
      WebPermissions.WASTAGE_READ,
    ],
  },
  {
    title: 'Inventory',
    icon: Warehouse,
    href: '/inventory-module',
    anyPermissions: [
      WebPermissions.INVENTORY_READ,
      WebPermissions.TRANSFER_READ,
    ],
  },
  {
    title: 'Contractor & Labour',
    icon: HardHat,
    href: '/workforce',
    anyPermissions: [
      WebPermissions.PARTY_READ,
      WebPermissions.LABOUR_READ,
      WebPermissions.CONTRACTOR_READ,
    ],
  },
  {
    title: 'Finance',
    icon: Wallet,
    href: '/finance',
    anyPermissions: [
      WebPermissions.PAYMENT_READ,
      WebPermissions.LEDGER_READ,
      WebPermissions.EXPENSE_READ,
      WebPermissions.GSTR_READ,
      WebPermissions.JOURNAL_READ,
      WebPermissions.FIXED_ASSET_READ,
    ],
  },
  {
    title: 'Reports',
    icon: FileBarChart,
    href: '/reports',
    anyPermissions: [
      WebPermissions.REPORT_READ,
      WebPermissions.REPORT_SALES_READ,
      WebPermissions.REPORT_ORDER_READ,
      WebPermissions.REPORT_PURCHASE_READ,
      WebPermissions.REPORT_PRODUCTION_READ,
      WebPermissions.REPORT_INVENTORY_READ,
      WebPermissions.REPORT_FINANCE_READ,
    ],
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
