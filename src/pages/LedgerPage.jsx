import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useTrialBalance, usePartyLedger, useCashBook, useMoneyAccounts } from '@/hooks/use-ledger';
import { useTabParam } from '@/hooks/use-tab-param';
import { DateText } from '@/components/date-text';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { ChartOfAccounts } from '@/components/ledger/chart-of-accounts';
import { VouchersList } from '@/components/ledger/vouchers-list';
import { ProfitAndLoss, BalanceSheet } from '@/components/ledger/financial-statements';

const ALL_TABS = [
  { key: 'Trial Balance' },
  // Statements are nothing but amounts; without VIEW_RATES the API refuses them.
  { key: 'Profit & Loss', permission: WebPermissions.VIEW_RATES },
  { key: 'Balance Sheet', permission: WebPermissions.VIEW_RATES },
  { key: 'Party Ledger' },
  { key: 'Cash Book' },
  { key: 'Chart of Accounts' },
  { key: 'Vouchers', permission: WebPermissions.JOURNAL_READ },
];

/**
 * The Cash Book reads one account at a time. The system Cash-in-Hand and Bank
 * Account are addressed by key (as they always were); any other cash or bank
 * account by id. Encoded in one select value so the choice is a single field.
 */
const cashBookParams = ({ account, from, to }) => {
  const [kind, value] = account.split(':');
  return { from, to, ...(kind === 'id' ? { accountId: value } : { accountKey: value }) };
};

export default function LedgerPage() {
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const tabs = ALL_TABS.filter((t) => !t.permission || hasPermission(user, t.permission)).map((t) => t.key);

  const [activeTab, setActiveTab] = useTabParam(tabs, 'Trial Balance', 'subtab');
  const [factoryId, setFactoryId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [cashRange, setCashRange] = useState({ from: '', to: '', account: 'key:CASH' });
  const { data: moneyAccounts = [] } = useMoneyAccounts();
  // The two system accounts are already offered by key.
  const namedMoneyAccounts = moneyAccounts.filter((a) => !a.isSystem);

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: partyData } = useParties({ page: 1, limit: 100 });

  const trialBalance = useTrialBalance(factoryId || undefined);
  const partyLedger = usePaginated(usePartyLedger, { partyId: partyId || undefined });
  const cashBook = useCashBook(factoryId || undefined, cashBookParams(cashRange));

  return (
    <div className="space-y-6">
      

      <div className="flex border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Trial Balance' && (
        <div className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="tb-factory">Factory (optional — leave blank for all)</Label>
            <select id="tb-factory" value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="">All Factories</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {trialBalance.isLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'code', header: 'Code' },
                { accessorKey: 'name', header: 'Account' },
                { accessorKey: 'type', header: 'Type' },
                ...(showRates
                  ? [
                      { id: 'debit', header: 'Debit', cell: ({ row }) => formatINR(row.original.totalDebitPaise) },
                      { id: 'credit', header: 'Credit', cell: ({ row }) => formatINR(row.original.totalCreditPaise) },
                      { id: 'balance', header: 'Balance', cell: ({ row }) => formatINR(row.original.balancePaise) },
                    ]
                  : []),
              ]}
              data={trialBalance.data || []}
              searchKey="name"
            />
          )}
        </div>
      )}

      {activeTab === 'Party Ledger' && (
        <div className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="pl-party">Party</Label>
            <select id="pl-party" value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="">Select a party</option>
              {(partyData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partyType})</option>)}
            </select>
          </div>
          {partyId && showRates && partyLedger.query.data && (
            <p className="text-sm">
              Outstanding: <span className="font-semibold">{formatINR(partyLedger.query.data.outstandingPaise)}</span>
              <span className="text-muted-foreground"> (positive = they owe us; negative = we owe them)</span>
            </p>
          )}
          {partyId && (
            partyLedger.query.isLoading ? (
              <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
            ) : (
              <DataTable
                columns={[
                  { id: 'date', header: 'Date', cell: ({ row }) => row.original.journalEntry?.entryDate },
                  { id: 'account', header: 'Account', cell: ({ row }) => row.original.account?.name },
                  { id: 'narration', header: 'Narration', cell: ({ row }) => row.original.journalEntry?.narration },
                  ...(showRates
                    ? [
                        { id: 'debit', header: 'Debit', cell: ({ row }) => formatINR(row.original.debitPaise) },
                        { id: 'credit', header: 'Credit', cell: ({ row }) => formatINR(row.original.creditPaise) },
                      ]
                    : []),
                ]}
                {...partyLedger.tableProps}
              />
            )
          )}
        </div>
      )}

      {activeTab === 'Cash Book' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-3xl">
            <div className="space-y-1.5">
              <Label htmlFor="cb-factory">Factory</Label>
              <select id="cb-factory" value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-account">Account</Label>
              <select id="cb-account" value={cashRange.account} onChange={(e) => setCashRange({ ...cashRange, account: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="key:CASH">Cash-in-Hand</option>
                <option value="key:BANK">Bank Account</option>
                {namedMoneyAccounts.map((a) => <option key={a.id} value={`id:${a.id}`}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-from">From</Label>
              <Input id="cb-from" type="date" value={cashRange.from} onChange={(e) => setCashRange({ ...cashRange, from: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-to">To</Label>
              <Input id="cb-to" type="date" value={cashRange.to} onChange={(e) => setCashRange({ ...cashRange, to: e.target.value })} />
            </div>
          </div>
          {factoryId && showRates && cashBook.data && (
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <span>Opening <span className="font-semibold tabular-nums">{formatINR(cashBook.data.openingBalancePaise)}</span></span>
              <span>In <span className="font-semibold tabular-nums text-emerald-600">{formatINR(cashBook.data.totalInPaise)}</span></span>
              <span>Out <span className="font-semibold tabular-nums text-rose-600">{formatINR(cashBook.data.totalOutPaise)}</span></span>
              <span>Closing <span className="font-semibold tabular-nums">{formatINR(cashBook.data.closingBalancePaise)}</span></span>
            </div>
          )}
          {factoryId && (
            cashBook.isLoading ? (
              <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
            ) : (
              <DataTable
                columns={[
                  { id: 'date', header: 'Date', cell: ({ row }) => <DateText value={row.original.date} /> },
                  { accessorKey: 'narration', header: 'Narration' },
                  { accessorKey: 'referenceType', header: 'Reference' },
                  ...(showRates
                    ? [
                        { id: 'debit', header: 'Debit', cell: ({ row }) => formatINR(row.original.debitPaise) },
                        { id: 'credit', header: 'Credit', cell: ({ row }) => formatINR(row.original.creditPaise) },
                        { id: 'balance', header: 'Running Balance', cell: ({ row }) => formatINR(row.original.runningBalancePaise) },
                      ]
                    : []),
                ]}
                data={cashBook.data?.rows || []}
                searchKey="narration"
              />
            )
          )}
        </div>
      )}

      {activeTab === 'Profit & Loss' && <ProfitAndLoss />}
      {activeTab === 'Balance Sheet' && <BalanceSheet />}
      {activeTab === 'Chart of Accounts' && <ChartOfAccounts />}
      {activeTab === 'Vouchers' && <VouchersList />}
    </div>
  );
}
