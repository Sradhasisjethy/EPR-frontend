import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';

import PartiesPage from './PartiesPage';
import ProductsPage from './ProductsPage';
import PriceListsPage from './PriceListsPage';
import VehiclesPage from './VehiclesPage';

const ALL_TABS = [
  { key: 'parties', label: 'Parties', permission: WebPermissions.PARTY_READ },
  { key: 'products', label: 'Products & BOM', permission: WebPermissions.PRODUCT_READ },
  { key: 'price-lists', label: 'Price Lists', permission: WebPermissions.PRICING_READ },
  { key: 'vehicles', label: 'Vehicles', permission: WebPermissions.VEHICLE_READ },
];

export default function MastersPage() {
  const { data: user } = useCurrentUser();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'parties');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Masters</h2>
        <p className="text-muted-foreground">Manage your core reference data</p>
      </div>

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
        {activeTab === 'parties' && <PartiesPage />}
        {activeTab === 'products' && <ProductsPage />}
        {activeTab === 'price-lists' && <PriceListsPage />}
        {activeTab === 'vehicles' && <VehiclesPage />}
      </div>
    </div>
  );
}
