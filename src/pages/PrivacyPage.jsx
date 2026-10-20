import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { PageDescription } from '@/components/layout/page-description';
import { PrivacyOverviewTab } from '@/components/privacy/overview-tab';
import { PrivacyRequestsTab } from '@/components/privacy/requests-tab';
import { PrivacyConsentsTab } from '@/components/privacy/consents-tab';
import { PrivacyBreachesTab } from '@/components/privacy/breaches-tab';
import { PrivacyRetentionTab } from '@/components/privacy/retention-tab';
import { PrivacyNoticeTab } from '@/components/privacy/notice-tab';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'requests', label: 'Requests' },
  { key: 'consents', label: 'Consent register' },
  { key: 'breaches', label: 'Breaches' },
  { key: 'retention', label: 'Retention' },
  { key: 'notice', label: 'Notice & contact' },
];
const tabKeys = tabs.map((tab) => tab.key);

/**
 * The Digital Personal Data Protection Act desk. It belongs to the application
 * owner and spans every organisation; the route lets in only the accounts the
 * server names in PLATFORM_OWNER_EMAILS, so every tab is theirs.
 */
export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'overview');

  return (
    <div className="space-y-6">
      <PageDescription>Digital Personal Data Protection Act, 2023, for every organisation using the application: notice, consent, people's requests, breaches and retention</PageDescription>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer',
              activeTab === tab.key ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'overview' && <PrivacyOverviewTab onOpenTab={setActiveTab} />}
        {activeTab === 'requests' && <PrivacyRequestsTab />}
        {activeTab === 'consents' && <PrivacyConsentsTab />}
        {activeTab === 'breaches' && <PrivacyBreachesTab />}
        {activeTab === 'retention' && <PrivacyRetentionTab />}
        {activeTab === 'notice' && <PrivacyNoticeTab />}
      </div>
    </div>
  );
}
