import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useFactories } from '@/hooks/use-factory';
import { useGstr1, useGstr3b } from '@/hooks/use-gstr';
import { useTabParam } from '@/hooks/use-tab-param';
import { DateText } from '@/components/date-text';

const TABS = ['GSTR-1', 'GSTR-3B'];

const StatCard = ({ label, value }) => (
  <div className="p-4 rounded-xl border border-border bg-card">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default function GstrPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'GSTR-1', 'subtab');
  const [factoryId, setFactoryId] = useState('');
  const [range, setRange] = useState({ fromDate: '', toDate: '' });

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });

  const params = factoryId && range.fromDate && range.toDate ? { factoryId, ...range } : undefined;
  const gstr1 = useGstr1(params);
  const gstr3b = useGstr3b(params);

  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        <div className="space-y-1.5">
          <Label>Factory</Label>
          <select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
            <option value="" disabled>Select factory</option>
            {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={range.fromDate} onChange={(e) => setRange({ ...range, fromDate: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={range.toDate} onChange={(e) => setRange({ ...range, toDate: e.target.value })} required />
        </div>
      </div>

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

      {!params && <p className="text-sm text-muted-foreground">Select a factory and date range to generate the return.</p>}

      {activeTab === 'GSTR-1' && params && (
        gstr1.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : gstr1.data && (
          <div className="space-y-8">
            {showRates && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StatCard label="Taxable Value" value={formatINR(gstr1.data.summary.taxableValuePaise)} />
                <StatCard label="CGST" value={formatINR(gstr1.data.summary.cgstPaise)} />
                <StatCard label="SGST" value={formatINR(gstr1.data.summary.sgstPaise)} />
                <StatCard label="IGST" value={formatINR(gstr1.data.summary.igstPaise)} />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">B2B Invoices</h3>
              <DataTable
                columns={[
                  { accessorKey: 'invoiceNumber', header: 'Invoice #' },
                  { id: 'invoiceDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.invoiceDate} /> },
                  { accessorKey: 'customerName', header: 'Customer' },
                  { accessorKey: 'customerGstin', header: 'GSTIN' },
                  { accessorKey: 'placeOfSupply', header: 'Place of Supply' },
                  ...(showRates
                    ? [
                        { id: 'taxable', header: 'Taxable', cell: ({ row }) => formatINR(row.original.taxableValuePaise) },
                        { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalPaise) },
                      ]
                    : []),
                ]}
                data={gstr1.data.b2b}
                searchKey="invoiceNumber"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">B2C Invoices</h3>
              <DataTable
                columns={[
                  { accessorKey: 'invoiceNumber', header: 'Invoice #' },
                  { id: 'invoiceDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.invoiceDate} /> },
                  { accessorKey: 'placeOfSupply', header: 'Place of Supply' },
                  ...(showRates
                    ? [
                        { id: 'taxable', header: 'Taxable', cell: ({ row }) => formatINR(row.original.taxableValuePaise) },
                        { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalPaise) },
                      ]
                    : []),
                ]}
                data={gstr1.data.b2c}
                searchKey="invoiceNumber"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">HSN Summary</h3>
              <DataTable
                columns={[
                  { accessorKey: 'hsnCode', header: 'HSN' },
                  { accessorKey: 'gstRatePercent', header: 'GST %' },
                  { accessorKey: 'totalQuantity', header: 'Qty' },
                  ...(showRates
                    ? [
                        { id: 'taxable', header: 'Taxable', cell: ({ row }) => formatINR(row.original.taxableValuePaise) },
                        { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalValuePaise) },
                      ]
                    : []),
                ]}
                data={gstr1.data.hsnSummary}
                searchKey="hsnCode"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Credit / Debit Notes (Table 9B — enter tax breakup manually on the portal)</h3>
              <DataTable
                columns={[
                  { accessorKey: 'noteNumber', header: 'Note #' },
                  { accessorKey: 'noteType', header: 'Type' },
                  { id: 'noteDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.noteDate} /> },
                  { accessorKey: 'customerName', header: 'Customer' },
                  { accessorKey: 'originalInvoiceNumber', header: 'Against Invoice' },
                  ...(showRates ? [{ id: 'value', header: 'Value', cell: ({ row }) => formatINR(row.original.valuePaise) }] : []),
                ]}
                data={gstr1.data.creditDebitNotes}
                searchKey="noteNumber"
              />
            </div>
          </div>
        )
      )}

      {activeTab === 'GSTR-3B' && params && (
        gstr3b.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : gstr3b.data && showRates && (
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">3.1(a) Outward Taxable Supplies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StatCard label="Taxable Value" value={formatINR(gstr3b.data.outwardSupplies.taxableValuePaise)} />
                <StatCard label="CGST" value={formatINR(gstr3b.data.outwardSupplies.cgstPaise)} />
                <StatCard label="SGST" value={formatINR(gstr3b.data.outwardSupplies.sgstPaise)} />
                <StatCard label="IGST" value={formatINR(gstr3b.data.outwardSupplies.igstPaise)} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">4. ITC Available (derived from goods receipts billed in the period)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StatCard label="Taxable Value" value={formatINR(gstr3b.data.itcAvailable.taxableValuePaise)} />
                <StatCard label="CGST" value={formatINR(gstr3b.data.itcAvailable.cgstPaise)} />
                <StatCard label="SGST" value={formatINR(gstr3b.data.itcAvailable.sgstPaise)} />
                <StatCard label="IGST" value={formatINR(gstr3b.data.itcAvailable.igstPaise)} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Net Tax Payable (informational — final utilization rules apply on the portal)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="CGST" value={formatINR(gstr3b.data.netTaxPayable.cgstPaise)} />
                <StatCard label="SGST" value={formatINR(gstr3b.data.netTaxPayable.sgstPaise)} />
                <StatCard label="IGST" value={formatINR(gstr3b.data.netTaxPayable.igstPaise)} />
              </div>
            </div>
          </div>
        )
      )}
      {activeTab === 'GSTR-3B' && params && !showRates && (
        <p className="text-sm text-muted-foreground">You don't have permission to view rate/amount figures.</p>
      )}
    </div>
  );
}
