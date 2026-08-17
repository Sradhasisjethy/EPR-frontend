import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Reports module data access.
 *
 * Everything the UI knows about a report — its columns, its filters, its
 * summary tiles — comes from the server, already filtered to what this user is
 * allowed to receive. There is no client-side catalog to keep in step, and no
 * client-side list of columns that could accidentally ask for a field the
 * server would refuse.
 */

/** Categories and the reports inside them the current user may open. */
export function useReportCatalog() {
  return useQuery({
    queryKey: ['report-catalog'],
    queryFn: async () => (await apiClient.get('/reports/catalog')).data.data,
    staleTime: 5 * 60 * 1000,
  });
}

/** A report's definition without running it — enough to draw the filter bar. */
export function useReportMeta(category, report) {
  return useQuery({
    queryKey: ['report-meta', category, report],
    queryFn: async () => (await apiClient.get(`/reports/${category}/${report}/meta`)).data.data,
    enabled: Boolean(category && report),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/**
 * One page of a report plus the summary over the whole filtered set.
 * `keepPreviousData` keeps the table on screen while a new page loads, so
 * paging does not flash an empty grid.
 */
export function useReportData(category, report, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['report-data', category, report, params],
    queryFn: async () => (await apiClient.get(`/reports/${category}/${report}`, { params })).data.data,
    enabled: Boolean(category && report) && enabled,
    placeholderData: (previous) => previous,
    retry: false,
  });
}

/**
 * Downloads the full filtered result set.
 *
 * Fetched as a blob over XHR rather than a plain link because the endpoint
 * needs the session cookie, and the filename is taken from the server's
 * Content-Disposition so the file is named by whatever produced it.
 */
export function useReportExport() {
  return useMutation({
    mutationFn: async ({ category, report, params, format }) => {
      const response = await apiClient.get(`/reports/${category}/${report}/export`, {
        params: { ...params, format },
        responseType: 'blob',
      });

      const disposition = response.headers['content-disposition'] || '';
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match ? match[1] : `${report}.${format}`;

      const url = URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return filename;
    },
  });
}

/**
 * An export failure arrives as a Blob (the request asked for one), so the
 * server's JSON error message has to be read back out of it before it can be
 * shown — otherwise every failure reads "[object Blob]".
 */
export async function readExportError(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message;
    } catch {
      return 'The export could not be generated.';
    }
  }
  return data?.message || 'The export could not be generated.';
}
