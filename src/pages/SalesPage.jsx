import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { useUIStore } from '@/store/ui-store';
import { PageDescription } from '@/components/layout/page-description';
import { ShieldAlert } from 'lucide-react';

import LeadsPage from './LeadsPage';
import QuotationsPage from './QuotationsPage';
import SalesOrdersPage from './SalesOrdersPage';
import CounterSalesPage from './CounterSalesPage';
import CashRegisterPage from './CashRegisterPage';
import DispatchPage from './DispatchPage';
import InvoicingPage from './InvoicingPage';
import ReturnsPage from './ReturnsPage';

const ALL_TABS = [
  // In the order a sale actually happens: an enquiry becomes a quotation, and
  // a quotation the customer accepts becomes the order on the next tab.
  { key: 'leads', label: 'Leads', permission: WebPermissions.LEAD_READ },
  { key: 'quotations', label: 'Quotations', permission: WebPermissions.QUOTATION_READ },
  { key: 'sales-orders', label: 'Sales Orders', permission: WebPermissions.SALES_READ },
  // Sits beside the order-driven flow rather than in a module of its own: a
  // counter sale produces the same tax invoice, just without the order and
  // challan in front of it.
  { key: 'counter-sales', label: 'Counter Sales', permission: WebPermissions.INVOICE_READ },
  { key: 'cash-register', label: 'Cash Register', permission: WebPermissions.CASH_REGISTER_READ },
  { key: 'dispatch', label: 'Delivery Challans', permission: WebPermissions.DISPATCH_READ },
  { key: 'invoices', label: 'Sales Invoices', permission: WebPermissions.INVOICE_READ },
  { key: 'returns', label: 'Returns', permission: WebPermissions.RETURN_READ },
];

export default function SalesPage() {
  const { data: user } = useCurrentUser();
  const { glassMode } = useUIStore();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  // Sales Orders stays the landing tab even though Quotations is listed first:
  // the tab order follows the flow, the default follows what people open.
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys.includes('sales-orders') ? 'sales-orders' : tabKeys[0] || 'sales-orders');

  return (
    <div className="space-y-6">
      <PageDescription>Manage your sales lifecycle</PageDescription>

      {tabs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border bg-card/40 my-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Your current account role does not have permission to view records in this module. Please contact your system administrator to assign the necessary roles.
          </p>
        </div>
      ) : (
        <>
          {glassMode ? (
            <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                      : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer',
                    activeTab === tab.key
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="pt-2">
            {activeTab === 'leads' && <LeadsPage />}
            {activeTab === 'quotations' && <QuotationsPage />}
            {activeTab === 'sales-orders' && <SalesOrdersPage />}
            {activeTab === 'counter-sales' && <CounterSalesPage />}
            {activeTab === 'cash-register' && <CashRegisterPage />}
            {activeTab === 'dispatch' && <DispatchPage />}
            {activeTab === 'invoices' && <InvoicingPage />}
            {activeTab === 'returns' && <ReturnsPage />}
          </div>
        </>
      )}
    </div>
  );
}
