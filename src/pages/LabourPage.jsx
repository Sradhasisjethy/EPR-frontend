import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';

import WorkforcePage from './WorkforcePage';
import ReportsPage from './ReportsPage';

const ALL_TABS = [
  { key: 'attendance', label: 'Attendance', permission: WebPermissions.LABOUR_READ },
  { key: 'wage', label: 'Wage', permission: WebPermissions.REPORT_LABOUR_READ },
];

export default function LabourPage() {
  const { data: user } = useCurrentUser();

  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'attendance');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Labour</h2>
        <p className="text-muted-foreground">Manage attendance and wages</p>
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
        {activeTab === 'attendance' && <WorkforcePage defaultTab="attendance" />}
        {activeTab === 'wage' && <ReportsPage initialCategory="labour" initialReport="wages" />}
      </div>
    </div>
  );
}
