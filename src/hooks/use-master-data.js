import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { downloadApiFile } from '@/lib/api-document';

/**
 * One hook set for every master.
 *
 * The module key is a parameter, not a hook per screen, because the server side
 * is one route set for all of them — eleven copies of this file would be eleven
 * places to fix the same bug.
 */

const base = '/master-data';

export function useMasterDataModules() {
  return useQuery({
    queryKey: ['master-data', 'modules'],
    queryFn: async () => (await apiClient.get(`${base}/modules`)).data.data,
    select: (data) => (Array.isArray(data) ? data : []),
    staleTime: Infinity,
  });
}

/** The blank sample, with its worked examples and its Instructions sheet. */
export function useDownloadTemplate() {
  return useMutation({
    mutationFn: ({ module }) => downloadApiFile(`${base}/${module}/template`, { fallbackName: `${module}-sample.xlsx` }),
  });
}

/**
 * The whole filtered set, not the page on screen.
 *
 * `filters` is whatever the list is currently showing — status, search, party
 * type. Exporting page 1 of 40 would be worse than useless on a screen whose
 * whole purpose is bulk editing.
 */
export function useExportMasterData() {
  return useMutation({
    mutationFn: ({ module, filters }) =>
      downloadApiFile(`${base}/${module}/export`, { params: filters, fallbackName: `${module}.xlsx` }),
  });
}

/** Uploads and checks a file. Writes nothing — the answer is a preview. */
export function useValidateImport() {
  return useMutation({
    mutationFn: async ({ module, file, importMode = 'UPSERT', filters = {} }) => {
      const body = new FormData();
      body.append('file', file);
      const { data } = await apiClient.post(`${base}/${module}/import/validate`, body, {
        params: { importMode, ...filters },
        // Left to the browser: axios must not set a multipart boundary itself.
        headers: { 'Content-Type': undefined },
      });
      return data.data;
    },
  });
}

/**
 * Writes the checked file. Names the run, never resends the rows — the server
 * holds what it checked, which is the point of the two-step.
 */
export function useCommitImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ importId }) => (await apiClient.post(`${base}/imports/${importId}/commit`)).data.data,
    onSuccess: () => {
      // An import can touch any master, and half the screens show derived
      // lists of them. Clearing everything is blunt and correct.
      queryClient.invalidateQueries();
    },
  });
}

export function useDownloadImportErrors() {
  return useMutation({
    mutationFn: ({ importId }) =>
      downloadApiFile(`${base}/imports/${importId}/errors`, { fallbackName: 'import-errors.xlsx' }),
  });
}

export function useImportHistory(module, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['master-data', 'imports', module],
    queryFn: async () => (await apiClient.get(`${base}/imports`, { params: { module, limit: 5 } })).data.data,
    select: (data) => (Array.isArray(data?.rows) ? data.rows : []),
    enabled,
  });
}
