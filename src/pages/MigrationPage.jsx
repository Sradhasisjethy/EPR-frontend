import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useImportTemplates, useRunImport } from '@/hooks/use-migration';

const KIND_LABELS = {
  products: 'Products',
  parties: 'Parties (customers, vendors, contractors, labour)',
  openingStock: 'Opening Stock',
  openingPartyBalances: 'Opening Party Balances',
  openingCash: 'Opening Cash & Bank',
};

/**
 * Parses a pasted CSV into row objects.
 *
 * Deliberately kept simple and local: the file never leaves the browser until
 * the user asks for a dry run, and the server re-validates everything anyway.
 * Handles quoted fields containing commas, which Indian addresses routinely do.
 */
const parseCsv = (text) => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
  return { headers, rows };
};

export default function MigrationPage() {
  const { data: user } = useCurrentUser();
  const canRunMigration = hasPermission(user, WebPermissions.MIGRATION_RUN);
  const [kind, setKind] = useState('openingStock');
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { data: templates } = useImportTemplates();
  const runImport = useRunImport();

  const template = (templates || []).find((t) => t.kind === kind);
  const parsed = csv.trim() ? parseCsv(csv) : { headers: [], rows: [] };

  const run = (dryRun) => {
    setError('');
    setResult(null);
    if (!parsed.rows.length) {
      setError('Paste some CSV first — a header row plus at least one data row.');
      return;
    }
    runImport
      .mutateAsync({ kind, rows: parsed.rows, dryRun })
      .then(setResult)
      .catch((err) => setError(err.response?.data?.message || 'The import failed.'));
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result));
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        
        <p className="text-muted-foreground">
          One-time import of masters and opening balances at go-live (M29)
        </p>
      </div>

      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm space-y-1">
        <p className="font-medium">Opening stock must carry its real production date.</p>
        <p>
          If lots are dated at import instead, every piece of yard stock looks brand new and the dead-stock
          reporting is wrong from day one. The import refuses future-dated rows for exactly this reason.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>What are you importing?</Label>
            <select
              value={kind}
              onChange={(e) => { setKind(e.target.value); setResult(null); }}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          {template && (
            <div className="p-3 rounded-lg border border-border bg-card text-sm space-y-2">
              <p className="font-medium flex items-center gap-1.5"><FileSpreadsheet size={14} /> Required columns</p>
              <div className="flex flex-wrap gap-1">
                {template.requiredColumns.map((c) => (
                  <code key={c} className="px-1.5 py-0.5 rounded bg-muted text-xs">{c}</code>
                ))}
              </div>
              {template.optionalColumns?.length > 0 && (
                <>
                  <p className="font-medium text-muted-foreground">Optional</p>
                  <div className="flex flex-wrap gap-1">
                    {template.optionalColumns.map((c) => (
                      <code key={c} className="px-1.5 py-0.5 rounded bg-muted/50 text-xs text-muted-foreground">{c}</code>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setCsv([...template.requiredColumns, ...(template.optionalColumns || [])].join(','))}
              >
                Insert header row
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Label>CSV data</Label>
            <label className="text-xs text-primary hover:underline cursor-pointer">
              Choose a .csv file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder="factoryCode,productCode,quantity,productionDate&#10;BPL-1,RM-CEMENT,500,2026-01-15"
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
          />

          {parsed.rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {parsed.rows.length} data row(s), {parsed.headers.length} column(s) detected.
            </p>
          )}

          {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

          {canRunMigration && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => run(true)} disabled={runImport.isPending}>
                Dry run
              </Button>
              <Button onClick={() => run(false)} disabled={runImport.isPending}>
                <Upload size={16} /> {runImport.isPending ? 'Importing...' : 'Import'}
              </Button>
            </div>
          )}

          {result && (
            <div className={cn(
              'p-3 rounded-lg border text-sm space-y-2',
              result.valid
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            )}>
              <p className="font-medium flex items-center gap-1.5">
                {result.valid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {result.dryRun
                  ? `Dry run: ${result.valid ? 'all rows are valid — nothing was written' : 'validation failed'}`
                  : result.committed
                    ? `Imported ${result.imported} row(s)`
                    : 'Import rejected — nothing was written'}
              </p>
              {!result.valid && (
                <p className="text-xs">
                  The whole file is rejected when any row fails, so there is never a half-loaded import to unpick.
                </p>
              )}
            </div>
          )}

          {result?.errors?.length > 0 && (
            <DataTable
              columns={[
                { accessorKey: 'row', header: 'Row' },
                { accessorKey: 'field', header: 'Column' },
                { accessorKey: 'message', header: 'Problem' },
              ]}
              data={result.errors}
              emptyMessage="No errors."
            />
          )}
        </div>
      </div>
    </div>
  );
}
