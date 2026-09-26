import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { useUIStore } from '@/store/ui-store';
import { PageDescription } from '@/components/layout/page-description';

import WorkforcePage from './WorkforcePage';
import ReportsPage from './ReportsPage';

const ALL_TABS = [
  { key: 'attendance', label: 'Attendance', permission: WebPermissions.LABOUR_READ },
  { key: 'wage', label: 'Wage', permission: WebPermissions.REPORT_LABOUR_READ },
];

export default function LabourPage() {
  const { data: user } = useCurrentUser();
  const { glassMode } = useUIStore();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'attendance');

  return (
    <div className="space-y-6">
      <PageDescription>Manage attendance and wages</PageDescription>

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
        {activeTab === 'attendance' && <WorkforcePage defaultTab="attendance" />}
        {activeTab === 'wage' && <ReportsPage initialCategory="labour" initialReport="wages" />}
      </div>
    </div>
  );
}
