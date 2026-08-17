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
    title: 'Administration',
    icon: ShieldCheck,
    children: [
      { title: 'Users', href: '/employees' },
      { title: 'Roles & Permissions', href: '/roles' },
      { title: 'Organization', href: '/organization' },
      { title: 'Locations', href: '/factories', permission: WebPermissions.FACTORY_READ },
      { title: 'Navigation', soon: true },
      { title: 'System Settings', href: '/settings?tab=general' },
      { title: 'Data Migration', href: '/migration', permission: WebPermissions.MIGRATION_RUN },
    ],
  },
  {
    title: 'Masters',
    icon: Library,
    children: [
      { title: 'Customers', href: '/parties?tab=customer', permission: WebPermissions.PARTY_READ },
      { title: 'Vendors', href: '/parties?tab=vendor', permission: WebPermissions.PARTY_READ },
      { title: 'Contractors', href: '/parties?tab=contractor', permission: WebPermissions.PARTY_READ },
      { title: 'Labour', href: '/parties?tab=labour', permission: WebPermissions.PARTY_READ },
      { title: 'Products', href: '/products', permission: WebPermissions.PRODUCT_READ },
      { title: 'Categories', href: '/products?tab=categories', permission: WebPermissions.PRODUCT_READ },
      { title: 'UOM', href: '/products?tab=uom', permission: WebPermissions.PRODUCT_READ },
      { title: 'BOM', href: '/products?tab=mix-designs', permission: WebPermissions.PRODUCT_READ },
      { title: 'HSN Codes', href: '/products?tab=hsn-codes', permission: WebPermissions.PRODUCT_READ },
      { title: 'Price Lists', href: '/price-lists', permission: WebPermissions.PRICING_READ },
      { title: 'Sales References', href: '/parties?tab=sales-ref', permission: WebPermissions.PARTY_READ },
      { title: 'Vehicles', soon: true },
    ],
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    children: [
      { title: 'Sales Orders', href: '/sales-orders', permission: WebPermissions.SALES_READ },
      { title: 'Delivery Challans', href: '/dispatch', permission: WebPermissions.DISPATCH_READ },
      { title: 'Sales Invoices', href: '/invoices', permission: WebPermissions.INVOICE_READ },
      { title: 'Returns', href: '/returns', permission: WebPermissions.RETURN_READ },
      { title: 'Credit/Debit Notes', href: '/returns?tab=credit-notes', permission: WebPermissions.RETURN_READ },
      { title: 'Payments', href: '/payments', permission: WebPermissions.RECEIPT_READ },
      { title: 'Customer Ledger', href: '/ledger?tab=party-ledger', permission: WebPermissions.LEDGER_READ },
    ],
  },
  {
    title: 'Purchase',
    icon: Truck,
    children: [
      { title: 'Indents', href: '/purchasing', permission: WebPermissions.PURCHASE_READ },
      { title: 'Purchase Orders', href: '/purchasing?tab=orders', permission: WebPermissions.PURCHASE_READ },
      { title: 'Purchases', href: '/purchasing?tab=invoices', permission: WebPermissions.PURCHASE_READ },
      { title: 'Goods Receipts', href: '/purchasing?tab=receipts', permission: WebPermissions.PURCHASE_READ },
      { title: 'Returns', href: '/returns?tab=purchase-returns', permission: WebPermissions.RETURN_READ },
      { title: 'Payments', href: '/payments?tab=payments', permission: WebPermissions.PAYMENT_READ, alias: true },
      { title: 'Vendor Ledger', href: '/ledger?tab=party-ledger', permission: WebPermissions.LEDGER_READ, alias: true },
    ],
  },
  {
    title: 'Production',
    icon: Factory,
    children: [
      { title: 'Production Planning', href: '/production', permission: WebPermissions.PRODUCTION_READ },
      { title: 'Production Orders', soon: true },
      { title: 'Production Sheets', soon: true },
      { title: 'Material Consumption', soon: true },
      { title: 'Finished Goods', href: '/inventory', permission: WebPermissions.INVENTORY_READ, alias: true },
      { title: 'Production History', href: '/production?tab=entries', permission: WebPermissions.PRODUCTION_READ },
      { title: 'Variance Approvals', href: '/production?tab=approvals', permission: WebPermissions.PRODUCTION_APPROVE_VARIANCE },
      { title: 'Wastage', href: '/production?tab=wastage', permission: WebPermissions.WASTAGE_READ },
    ],
  },
  {
    title: 'Inventory',
    icon: Warehouse,
    children: [
      { title: 'Stock', href: '/inventory', permission: WebPermissions.INVENTORY_READ },
      { title: 'Stock Movement', href: '/inventory?tab=ledger', permission: WebPermissions.INVENTORY_READ },
      { title: 'Stock Transfer', href: '/transfers', permission: WebPermissions.TRANSFER_READ },
      { title: 'Stock Adjustment', href: '/reports/inventory/adjustments', permission: WebPermissions.REPORT_INVENTORY_READ },
      { title: 'Reservations', soon: true },
      { title: 'Stock Ageing', href: '/reports/ageing/stock-ageing', permission: WebPermissions.REPORT_INVENTORY_READ, alias: true },
      { title: 'Dead Stock', href: '/reports/ageing/dead-stock', permission: WebPermissions.REPORT_INVENTORY_READ, alias: true },
    ],
  },
  {
    title: 'Contractors',
    icon: HardHat,
    children: [
      { title: 'Contractors', href: '/parties?tab=contractor', permission: WebPermissions.PARTY_READ, alias: true },
      { title: 'Material Issues', href: '/workforce', permission: WebPermissions.CONTRACTOR_READ },
      { title: 'Production', href: '/workforce?tab=production-entries', permission: WebPermissions.CONTRACTOR_READ },
      { title: 'Advances', href: '/workforce?tab=advances', permission: WebPermissions.CONTRACTOR_READ },
      { title: 'Ledger', href: '/ledger?tab=party-ledger', permission: WebPermissions.LEDGER_READ, alias: true },
      { title: 'Payments', href: '/payments?tab=payments', permission: WebPermissions.PAYMENT_READ, alias: true },
    ],
  },
  {
    title: 'Labour',
    icon: Users,
    children: [
      { title: 'Labour', href: '/parties?tab=labour', permission: WebPermissions.PARTY_READ, alias: true },
      { title: 'Attendance', href: '/workforce?tab=attendance', permission: WebPermissions.LABOUR_READ },
      { title: 'Wage', href: '/reports/labour/wages', permission: WebPermissions.REPORT_LABOUR_READ, alias: true },
      { title: 'Ledger', href: '/ledger?tab=party-ledger', permission: WebPermissions.LEDGER_READ, alias: true },
      { title: 'Payments', href: '/payments?tab=payments', permission: WebPermissions.PAYMENT_READ, alias: true },
    ],
  },
  {
    title: 'Finance',
    icon: Wallet,
    children: [
      { title: 'Payments', href: '/payments?tab=payments', permission: WebPermissions.PAYMENT_READ },
      { title: 'Cheques', href: '/payments?tab=cheques', permission: WebPermissions.RECEIPT_READ },
      { title: 'Cash/Bank', href: '/ledger?tab=cash-book', permission: WebPermissions.LEDGER_READ },
      { title: 'Trial Balance', href: '/ledger', permission: WebPermissions.LEDGER_READ },
      { title: 'Expenses', href: '/expenses', permission: WebPermissions.EXPENSE_READ },
      { title: 'GST Returns', href: '/gstr', permission: WebPermissions.GSTR_READ },
      { title: 'Day Book', href: '/reports/finance/day-book', permission: WebPermissions.REPORT_FINANCE_READ },
      { title: 'Cash Flow', href: '/reports/finance/cash-flow', permission: WebPermissions.REPORT_FINANCE_READ },
      { title: 'Receivables', href: '/reports/finance/receivables', permission: WebPermissions.REPORT_FINANCE_READ },
      { title: 'Payables', href: '/reports/finance/payables', permission: WebPermissions.REPORT_FINANCE_READ },
    ],
  },
  {
    // One entry per report *category*, not per report. There are 46 reports
    // behind these fourteen leaves; the category page lists its own reports as
    // chips, which is what keeps the sidebar readable. Each leaf is gated by the
    // same grant the API checks, so a leaf never opens onto a 403.
    title: 'Reports',
    icon: FileBarChart,
    children: [
      { title: 'Sales', href: '/reports/sales', permission: WebPermissions.REPORT_SALES_READ },
      { title: 'Orders', href: '/reports/orders', permission: WebPermissions.REPORT_ORDER_READ },
      { title: 'Purchase', href: '/reports/purchase', permission: WebPermissions.REPORT_PURCHASE_READ },
      { title: 'Production', href: '/reports/production', permission: WebPermissions.REPORT_PRODUCTION_READ },
      { title: 'Inventory', href: '/reports/inventory', permission: WebPermissions.REPORT_INVENTORY_READ },
      { title: 'Stock Ageing', href: '/reports/ageing', permission: WebPermissions.REPORT_INVENTORY_READ },
      { title: 'Customers', href: '/reports/customer', permission: WebPermissions.REPORT_CUSTOMER_READ },
      { title: 'Vendors', href: '/reports/vendor', permission: WebPermissions.REPORT_VENDOR_READ },
      { title: 'Contractors', href: '/reports/contractor', permission: WebPermissions.REPORT_CONTRACTOR_READ },
      { title: 'Labour', href: '/reports/labour', permission: WebPermissions.REPORT_LABOUR_READ },
      { title: 'Payments', href: '/reports/payment', permission: WebPermissions.REPORT_FINANCE_READ },
      { title: 'Expenses', href: '/reports/expense', permission: WebPermissions.REPORT_FINANCE_READ },
      { title: 'Finance', href: '/reports/finance', permission: WebPermissions.REPORT_FINANCE_READ },
      { title: 'Analytics', href: '/reports/analytics', permission: WebPermissions.REPORT_ANALYTICS_READ },
      { title: 'Saved Report Builder', href: '/reports/saved', permission: WebPermissions.REPORT_READ },
    ],
  },
  {
    // No permission gate: every role has a notification centre. What differs is
    // the content — money inside alert metadata is masked server-side.
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
  },
];
