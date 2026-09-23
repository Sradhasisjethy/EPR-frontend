import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatINR } from '@/lib/money';

const enabledFor = (params) => !!(params?.factoryId && params?.fromDate && params?.toDate);

export function useTaxRateSummary(params) {
  return useQuery({
    queryKey: ['gstr', 'tax-rate-summary', params],
    queryFn: async () => (await apiClient.get('/gstr/tax-rate-summary', { params })).data.data,
    enabled: enabledFor(params),
  });
}

export function useGstr9(params) {
  return useQuery({
    queryKey: ['gstr', 'gstr9', params],
    queryFn: async () => (await apiClient.get('/gstr/gstr9', { params })).data.data,
    enabled: enabledFor(params),
  });
}

const Loading = () => <div className="w-full h-72 rounded-xl border border-border bg-card animate-pulse" />;
const Failed = ({ error }) => (
  <div className="p-6 text-center rounded-xl border border-destructive/20 text-destructive text-sm">
    {error?.response?.data?.message || 'Could not load this return.'}
  </div>
);

const TH = ({ children, right }) => <th className={`px-3 py-2 font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const TD = ({ children, right, strong }) => (
  <td className={`px-3 py-1.5 ${right ? 'text-right tabular-nums' : ''} ${strong ? 'font-semibold' : ''}`}>{children}</td>
);

/** Output and input tax side by side for each GST rate. */
export function TaxRateSummary({ params }) {
  const { data, isLoading, isError, error } = useTaxRateSummary(params);
  if (isLoading) return <Loading />;
  if (isError) return <Failed error={error} />;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <TH>GST rate</TH>
            <TH right>Sales taxable</TH>
            <TH right>Output tax</TH>
            <TH right>Purchases taxable</TH>
            <TH right>Input tax (ITC)</TH>
            <TH right>Net</TH>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No taxable sales or purchases in this period.</td></tr>
          )}
          {data.rows.map((r) => (
            <tr key={r.gstRatePercent} className="border-t border-border/50">
              <TD>{r.gstRatePercent}%</TD>
              <TD right>{formatINR(r.outward.taxableValuePaise)}</TD>
              <TD right>{formatINR(r.outward.totalTaxPaise)}</TD>
              <TD right>{formatINR(r.inward.taxableValuePaise)}</TD>
              <TD right>{formatINR(r.inward.totalTaxPaise)}</TD>
              <TD right>{formatINR(r.outward.totalTaxPaise - r.inward.totalTaxPaise)}</TD>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <TD strong>Total</TD>
            <TD right strong>{formatINR(data.totals.outward.taxableValuePaise)}</TD>
            <TD right strong>{formatINR(data.totals.outward.totalTaxPaise)}</TD>
            <TD right strong>{formatINR(data.totals.inward.taxableValuePaise)}</TD>
            <TD right strong>{formatINR(data.totals.inward.totalTaxPaise)}</TD>
            <TD right strong>{formatINR(data.totals.outward.totalTaxPaise - data.totals.inward.totalTaxPaise)}</TD>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const TaxRow = ({ label, v }) => (
  <tr className="border-t border-border/50">
    <TD>{label}</TD>
    <TD right>{v.taxableValuePaise === undefined ? '' : formatINR(v.taxableValuePaise)}</TD>
    <TD right>{formatINR(v.cgstPaise)}</TD>
    <TD right>{formatINR(v.sgstPaise)}</TD>
    <TD right>{formatINR(v.igstPaise)}</TD>
  </tr>
);

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold">{title}</h3>
    <div className="rounded-xl border border-border overflow-x-auto">{children}</div>
  </div>
);

const TaxHead = () => (
  <thead className="bg-muted/30 text-xs text-muted-foreground">
    <tr><TH>&nbsp;</TH><TH right>Taxable value</TH><TH right>CGST</TH><TH right>SGST</TH><TH right>IGST</TH></tr>
  </thead>
);

/**
 * Working papers for the annual return. Choose the financial year as the date
 * range; the figures come from the same calculations as GSTR-1 and GSTR-3B.
 */
export function Gstr9({ params }) {
  const { data, isLoading, isError, error } = useGstr9(params);
  if (isLoading) return <Loading />;
  if (isError) return <Failed error={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        Working papers from your books. Compare them with the portal&apos;s auto-drafted GSTR-9, which is built from the GSTR-1 and GSTR-3B you filed.
      </p>

      <Section title="Table 4 — Outward taxable supplies">
        <table className="w-full text-sm">
          <TaxHead />
          <tbody>
            <TaxRow label="To registered persons (B2B)" v={data.table4.b2b} />
            <TaxRow label="To unregistered persons (B2C)" v={data.table4.b2c} />
            <TaxRow label="Total" v={data.table4.total} />
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border/50">
          Credit notes and sales returns issued in the period: {formatINR(data.table4.creditNotesAndReturnsValuePaise)} (value including tax — enter the tax split on the portal).
        </p>
      </Section>

      <Section title="Table 6 — Input tax credit availed">
        <table className="w-full text-sm">
          <TaxHead />
          <tbody><TaxRow label="Inputs (from purchase invoices)" v={data.table6.itcAvailed} /></tbody>
        </table>
      </Section>

      <Section title="Table 9 — Tax payable, per books">
        <table className="w-full text-sm">
          <TaxHead />
          <tbody>
            <TaxRow label="Tax on outward supplies" v={data.table9.taxPayable} />
            <TaxRow label="Less: ITC" v={data.table9.itcUtilised} />
            <TaxRow label="Net payable" v={data.table9.netPayable} />
          </tbody>
        </table>
      </Section>

      <Section title="Table 17 — HSN summary of outward supplies">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr><TH>HSN</TH><TH right>GST %</TH><TH right>Qty</TH><TH right>Taxable value</TH><TH right>Total tax</TH></tr>
          </thead>
          <tbody>
            {data.table17.hsnSummary.map((h) => (
              <tr key={`${h.hsnCode}-${h.gstRatePercent}`} className="border-t border-border/50">
                <TD>{h.hsnCode}</TD>
                <TD right>{h.gstRatePercent}</TD>
                <TD right>{h.totalQuantity}</TD>
                <TD right>{formatINR(h.taxableValuePaise)}</TD>
                <TD right>{formatINR(h.cgstPaise + h.sgstPaise + h.igstPaise)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Month by month — reconcile with each GSTR-3B filed">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr><TH>Month</TH><TH right>Outward taxable</TH><TH right>Output tax</TH><TH right>ITC</TH><TH right>Net payable</TH></tr>
          </thead>
          <tbody>
            {data.months.map((m) => (
              <tr key={m.month} className="border-t border-border/50">
                <TD>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</TD>
                <TD right>{formatINR(m.outwardTaxablePaise)}</TD>
                <TD right>{formatINR(m.outwardTaxPaise)}</TD>
                <TD right>{formatINR(m.itcPaise)}</TD>
                <TD right>{formatINR(m.netPayablePaise)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
