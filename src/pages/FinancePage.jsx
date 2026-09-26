import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { useUIStore } from '@/store/ui-store';
import { PageDescription } from '@/components/layout/page-description';
import { ShieldAlert } from 'lucide-react';

import PaymentsPage from './PaymentsPage';
import LedgerPage from './LedgerPage';
import ExpensesPage from './ExpensesPage';
import GstrPage from './GstrPage';
import FixedAssetsPage from './FixedAssetsPage';

const ALL_TABS = [
  { key: 'payments', label: 'Receipts & Payments', permission: WebPermissions.PAYMENT_READ },
  { key: 'ledger', label: 'Ledger', permission: WebPermissions.LEDGER_READ },
  { key: 'expenses', label: 'Expenses', permission: WebPermissions.EXPENSE_READ },
  { key: 'fixed-assets', label: 'Fixed Assets', permission: WebPermissions.FIXED_ASSET_READ },
  { key: 'gstr', label: 'GST Returns', permission: WebPermissions.GSTR_READ },
];

export default function FinancePage() {
  const { data: user } = useCurrentUser();
  const { glassMode } = useUIStore();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'payments');

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageDescription>Manage your finances, ledgers, and reporting</PageDescription>
      </div>

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
            <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs print:hidden">
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
            <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border print:hidden">
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
            {activeTab === 'payments' && <PaymentsPage />}
            {activeTab === 'ledger' && <LedgerPage />}
            {activeTab === 'expenses' && <ExpensesPage />}
            {activeTab === 'fixed-assets' && <FixedAssetsPage />}
            {activeTab === 'gstr' && <GstrPage />}
          </div>
        </>
      )}
    </div>
  );
}
