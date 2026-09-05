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
import { useTrialBalance, usePartyLedger, useCashBook } from '@/hooks/use-ledger';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Trial Balance', 'Party Ledger', 'Cash Book'];

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Trial Balance', 'subtab');
  const [factoryId, setFactoryId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [cashRange, setCashRange] = useState({ from: '', to: '', accountKey: 'CASH' });

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: partyData } = useParties({ page: 1, limit: 100 });

  const trialBalance = useTrialBalance(factoryId || undefined);
  const partyLedger = usePaginated(usePartyLedger, { partyId: partyId || undefined });
  const cashBook = useCashBook(factoryId || undefined, cashRange);

  return (
    <div className="space-y-6">
      

      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
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
            <Label>Factory (optional — leave blank for all)</Label>
            <select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
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
            <Label>Party</Label>
            <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
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
          <div className="grid grid-cols-4 gap-4 max-w-3xl">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <select value={cashRange.accountKey} onChange={(e) => setCashRange({ ...cashRange, accountKey: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={cashRange.from} onChange={(e) => setCashRange({ ...cashRange, from: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={cashRange.to} onChange={(e) => setCashRange({ ...cashRange, to: e.target.value })} />
            </div>
          </div>
          {factoryId && (
            cashBook.isLoading ? (
              <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
            ) : (
              <DataTable
                columns={[
                  { accessorKey: 'date', header: 'Date' },
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
                data={cashBook.data || []}
                searchKey="narration"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
