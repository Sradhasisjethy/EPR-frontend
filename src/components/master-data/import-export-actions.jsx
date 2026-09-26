import { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { useDownloadTemplate, useExportMasterData } from '@/hooks/use-master-data';
import { MasterImportDialog } from './import-dialog';
import { toast } from 'sonner';

/**
 * The three buttons that sit beside Add on a master data screen.
 *
 * One component for every master: the module key decides the endpoints, the
 * permissions and the file, all of which the server already knows. Dropping it
 * into a new screen is one line.
 *
 * Buttons appear only where the permission is held, and the API enforces the
 * same rule independently — hiding a button is a courtesy, not a control.
 *
 * @param {string} module   the master-data module key, e.g. 'products'
 * @param {string} label    what to call it in the dialog and the toasts
 * @param {string} resource the permission prefix, e.g. 'PRODUCT'
 * @param {object} filters  the filters the list is currently showing; the
 *                          export sends the whole matching set, not this page
 */
export function MasterImportExportActions({ module, label, resource, filters = {} }) {
  const { data: user } = useCurrentUser();
  const [importOpen, setImportOpen] = useState(false);

  const template = useDownloadTemplate();
  const exporter = useExportMasterData();

  const canImport = hasPermission(user, `${resource}_IMPORT`);
  const canExport = hasPermission(user, `${resource}_EXPORT`);
  const canRead = hasPermission(user, `${resource}_READ`);
  if (!canImport && !canExport && !canRead) return null;

  const failed = (error, fallback) => toast.error(error?.response?.data?.message || fallback);

  const onExport = () =>
    exporter
      .mutateAsync({ module, filters })
      .then((fileName) => toast.success(`Downloaded ${fileName}`))
      .catch((error) => failed(error, `${label} could not be exported.`));

  const onSample = () =>
    template
      .mutateAsync({ module })
      .then((fileName) => toast.success(`Downloaded ${fileName}`))
      .catch((error) => failed(error, 'The sample file could not be downloaded.'));

  return (
    <>
      {canImport && (
        <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload /> Import Excel
        </Button>
      )}
      {canExport && (
        <Button type="button" variant="outline" onClick={onExport} disabled={exporter.isPending}>
          {exporter.isPending ? <Loader2 className="animate-spin" /> : <Download />} Export Excel
        </Button>
      )}
      {canRead && (
        <Button type="button" variant="outline" onClick={onSample} disabled={template.isPending}>
          {template.isPending ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Sample Excel
        </Button>
      )}

      {canImport && (
        <MasterImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          module={module}
          label={label}
          filters={filters}
          canCreate={hasPermission(user, `${resource}_CREATE`)}
        />
      )}
    </>
  );
}
