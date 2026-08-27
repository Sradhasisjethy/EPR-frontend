import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';

import ProductionPage from './ProductionPage';
import QualityPage from './QualityPage';

const ALL_TABS = [
  { key: 'production', label: 'Production', permission: WebPermissions.PRODUCTION_READ },
  { key: 'quality', label: 'Quality Control', permission: WebPermissions.QUALITY_READ },
];

export default function ProductionModulePage() {
  const { data: user } = useCurrentUser();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'production');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Production</h2>
        <p className="text-muted-foreground">Manage your production lifecycle</p>
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
        {activeTab === 'production' && <ProductionPage />}
        {activeTab === 'quality' && <QualityPage />}
      </div>
    </div>
  );
}
