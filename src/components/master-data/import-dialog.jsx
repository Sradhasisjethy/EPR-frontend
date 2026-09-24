import { useMemo, useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, FileWarning, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useDownloadTemplate, useValidateImport, useCommitImport, useDownloadImportErrors,
} from '@/hooks/use-master-data';

/**
 * Sample, upload, check, look, confirm.
 *
 * The step that earns the dialog is the fourth one. Anybody can accept a file
 * and write it; what makes a bulk import safe to hand to an operations user is
 * being told, before anything is written, exactly how many records are new, how
 * many change, what changes about them, and which rows are wrong and why. Until
 * Confirm is pressed the database has not been touched.
 *
 * Nothing here is master-specific — the column names, the rules and the sample
 * all come from the server, so a new master gets this screen for free.
 */

const MODES = [
  { value: 'UPSERT', label: 'Create new and update existing', hint: 'The usual choice' },
  { value: 'CREATE', label: 'Create new only', hint: 'Refuses a row that already exists' },
  { value: 'UPDATE', label: 'Update existing only', hint: 'Refuses a row that is not already there' },
];

const STATUS_STYLE = {
  NEW: 'bg-emerald-500/10 text-emerald-600',
  UPDATE: 'bg-blue-500/10 text-blue-600',
  UNCHANGED: 'bg-muted text-muted-foreground',
  SKIP: 'bg-muted text-muted-foreground',
  ERROR: 'bg-destructive/10 text-destructive',
};

const STATUS_LABEL = { NEW: 'New', UPDATE: 'Update', UNCHANGED: 'No change', SKIP: 'Skipped', ERROR: 'Error' };

/** "90 seconds" reads better than "1.5 minutes"; "4 minutes" better than "240 seconds". */
const describeDuration = (seconds) => {
  if (seconds < 120) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'UPDATE', label: 'Changed' },
  { key: 'UNCHANGED', label: 'Unchanged' },
  { key: 'ERROR', label: 'Errors' },
];

function Tally({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

export function MasterImportDialog({ open, onOpenChange, module, label, filters = {}, canCreate = true }) {
  const [file, setFile] = useState(null);
  // A role that may not create records has only one honest mode, and the
  // select must not open on a value it does not offer.
  const [mode, setMode] = useState(canCreate ? 'UPSERT' : 'UPDATE');
  const [preview, setPreview] = useState(null);
  const [rowFilter, setRowFilter] = useState('ALL');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const template = useDownloadTemplate();
  const check = useValidateImport();
  const commit = useCommitImport();
  const errorFile = useDownloadImportErrors();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setRowFilter('ALL');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const said = (err, fallback) => setError(err?.response?.data?.message || fallback);

  const onSample = () =>
    template.mutateAsync({ module }).catch((err) => said(err, 'The sample file could not be downloaded.'));

  const onPick = (event) => {
    const chosen = event.target.files?.[0] || null;
    setFile(chosen);
    setPreview(null);
    setError('');
  };

  const onCheck = () => {
    if (!file) return;
    setError('');
    check
      .mutateAsync({ module, file, importMode: mode, filters })
      .then((result) => {
        setPreview(result);
        setRowFilter(result.errorRows ? 'ERROR' : 'ALL');
      })
      .catch((err) => {
        setPreview(null);
        said(err, 'That file could not be read.');
      });
  };

  const onConfirm = () => {
    setError('');
    commit
      .mutateAsync({ importId: preview.importId })
      .then((result) => {
        toast.success(
          `${label} imported — ${result.createdCount} created, ${result.updatedCount} updated`
        );
        close(false);
      })
      .catch((err) => said(err, 'Nothing was imported.'));
  };

  const rows = useMemo(() => {
    const all = preview?.rows || [];
    return rowFilter === 'ALL' ? all : all.filter((row) => row.status === rowFilter);
  }, [preview, rowFilter]);

  // The first few columns are enough to recognise a row; the rest is in the file.
  const shownColumns = (preview?.columns || []).slice(0, 4);
  const blocked = !preview || preview.errorRows > 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import {label} from Excel</DialogTitle>
          <DialogDescription>
            Nothing is saved until you press Import. If any row has a problem, the whole file is held back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-sm font-medium">1. Start from the sample</p>
            <p className="text-sm text-muted-foreground">
              It has the exact columns this import accepts, two worked example rows, and an Instructions sheet
              explaining every field. Delete the examples before you upload.
            </p>
            <Button type="button" variant="outline" onClick={onSample} disabled={template.isPending}>
              {template.isPending ? <Loader2 className="animate-spin" /> : <Download />} Download sample
            </Button>
          </section>

          <section className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-medium">2. Upload your file</p>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="master-import-file">Excel file (.xlsx)</Label>
                <input
                  id="master-import-file"
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={onPick}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="master-import-mode">What this file should do</Label>
                <select
                  id="master-import-mode"
                  value={mode}
                  onChange={(event) => { setMode(event.target.value); setPreview(null); }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {MODES.filter((option) => canCreate || option.value === 'UPDATE').map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{MODES.find((m) => m.value === mode)?.hint}</p>
              </div>
            </div>

            <Button type="button" onClick={onCheck} disabled={!file || check.isPending}>
              {check.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Check this file
            </Button>
          </section>

          {error && (
            <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p className="whitespace-pre-line">{error}</p>
            </div>
          )}

          {preview && (
            <section className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">3. What this will do</p>
                <span className="text-xs text-muted-foreground truncate">{preview.fileName}</span>
              </div>

              <div role="group" aria-label="What this file will do" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Tally label="Rows in file" value={preview.totalRows} />
                <Tally label="New" value={preview.newRows} tone="text-emerald-600" />
                <Tally label="Changed" value={preview.updateRows} tone="text-blue-600" />
                <Tally label="Unchanged" value={preview.unchangedRows} />
                <Tally label="Errors" value={preview.errorRows} tone={preview.errorRows ? 'text-destructive' : undefined} />
              </div>

              {preview.estimatedCommitSeconds > 15 && (
                <p className="flex gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    This will take about <strong className="text-foreground">{describeDuration(preview.estimatedCommitSeconds)}</strong>.
                    Each record is written through the same checks the form uses, and the database is{' '}
                    {preview.databaseRoundTripMs} ms away. Leave this window open until it finishes.
                  </span>
                </p>
              )}

              {(preview.warnings || []).map((warning) => (
                <p key={warning} className="flex gap-2 text-xs text-amber-600">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> {warning}
                </p>
              ))}

              {preview.skippedRows > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.skippedRows} row(s) were left exactly as they are — see the Skipped reason in the table.
                </p>
              )}

              <div className="flex flex-wrap gap-1">
                {FILTERS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRowFilter(option.key)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      rowFilter === option.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="max-h-72 overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium w-16">Row</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium w-24">Action</th>
                      {shownColumns.map((column) => (
                        <th key={column} scope="col" className="px-3 py-2 text-left font-medium">{column}</th>
                      ))}
                      <th scope="col" className="px-3 py-2 text-left font-medium">What happens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={shownColumns.length + 3} className="px-3 py-6 text-center text-muted-foreground">No rows of this kind.</td></tr>
                    )}
                    {rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-border align-top">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_STYLE[row.status])}>
                            {STATUS_LABEL[row.status] || row.status}
                          </span>
                        </td>
                        {shownColumns.map((column) => (
                          <td key={column} className="px-3 py-2 truncate max-w-[16rem]">{row.values?.[column] ?? '—'}</td>
                        ))}
                        <td className="px-3 py-2 text-xs">
                          {row.status === 'ERROR' && (
                            <span className="text-destructive">{row.errors.map((e) => e.message).join('; ')}</span>
                          )}
                          {row.status === 'SKIP' && <span className="text-muted-foreground">{row.note}</span>}
                          {row.status === 'UPDATE' && (
                            <span className="text-muted-foreground">
                              {Object.entries(row.changes || {}).map(([field, change]) => (
                                <span key={field} className="block">
                                  {field}: {String(change.from ?? '—')} → <strong className="text-foreground">{String(change.to)}</strong>
                                </span>
                              ))}
                            </span>
                          )}
                          {row.status === 'NEW' && <span className="text-muted-foreground">Will be created</span>}
                          {row.status === 'UNCHANGED' && <span className="text-muted-foreground">Already matches — nothing to do</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.truncated && (
                <p className="text-xs text-muted-foreground">
                  Showing the first {preview.rows.length} of {preview.totalRows} rows. The error file below lists every failed row.
                </p>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {preview?.errorRows > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => errorFile.mutateAsync({ importId: preview.importId }).catch((err) => said(err, 'The error file could not be downloaded.'))}
                disabled={errorFile.isPending}
              >
                {errorFile.isPending ? <Loader2 className="animate-spin" /> : <FileWarning />} Download the {preview.errorRows} failed row(s)
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="button" onClick={onConfirm} disabled={blocked || commit.isPending}>
              {commit.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {commit.isPending
                ? `Importing ${preview.newRows + preview.updateRows} record(s)…`
                : preview && !blocked
                  ? `Import ${preview.newRows + preview.updateRows} record(s)`
                  : 'Import'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
