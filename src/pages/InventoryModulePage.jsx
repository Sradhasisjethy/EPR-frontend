import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { ShieldAlert } from 'lucide-react';

import InventoryPage from './InventoryPage';
import TransfersPage from './TransfersPage';
import ReservationsPage from './ReservationsPage';

const ALL_TABS = [
  { key: 'stock', label: 'Stock', permission: WebPermissions.INVENTORY_READ },
  { key: 'transfers', label: 'Stock Transfer', permission: WebPermissions.TRANSFER_READ },
  { key: 'reservations', label: 'Reservations', permission: WebPermissions.INVENTORY_READ },
];

export default function InventoryModulePage() {
  const { data: user } = useCurrentUser();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'stock');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-muted-foreground">Manage your stock, transfers, and inventory reports</p>
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
          <div className="flex gap-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-2">
            {activeTab === 'stock' && <InventoryPage />}
            {activeTab === 'transfers' && <TransfersPage />}
            {activeTab === 'reservations' && <ReservationsPage />}
          </div>
        </>
      )}
    </div>
  );
}
