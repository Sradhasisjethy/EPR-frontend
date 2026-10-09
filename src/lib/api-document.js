import { apiClient } from '@/lib/api-client';

/**
 * Opens a PDF the API generates — a challan, a job card — in a new tab.
 *
 * These used to be plain `<a href>` links built from the API base URL. That
 * works only while the API shares an origin with the app: `VITE_API_URL` points
 * at a different port, and a browser does not attach cookies to a link
 * navigation cross-origin. The request arrived with no credential at all and
 * the API answered "Access token is missing" — while every other call on the
 * page kept working, because axios sends them with `withCredentials`.
 *
 * Fetching through the same client fixes it wherever ordinary calls already
 * work, and it inherits the 401 interceptor as well: an expired access token is
 * refreshed and the document still opens, instead of the user meeting a raw
 * error page in a fresh tab.
 */
/** The filename the server chose, out of its Content-Disposition header. */
function filenameFrom(headers, fallback) {
  const disposition = headers?.['content-disposition'] || '';
  // RFC 6266: the UTF-8 `filename*` wins when both are present; the plain
  // `filename` is an ASCII fallback and may hold a literal % that is no escape.
  const extended = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // Malformed escape — fall through to the plain name.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  if (!plain) return fallback;
  try {
    return decodeURIComponent(plain[1]);
  } catch {
    return plain[1];
  }
}

/**
 * Types a browser renders without running anything. A blob: URL inherits this
 * app's origin, and a tab navigated to one ignores the server's `attachment`
 * and `nosniff` — so an HTML or SVG file opened that way would run as the app
 * itself, with the user's session. Anything else is saved, never shown.
 */
const INLINE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

function saveBlobUrl(url, name) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Saves a file the API generates — a master-data workbook, a sample, an error
 * report — under the name the server gave it.
 *
 * Goes through the same axios client as everything else for the reason spelled
 * out above: a plain link carries no credentials cross-origin and does not
 * benefit from the token refresh. Reading the name from Content-Disposition
 * rather than composing it here keeps one source of truth — the server already
 * decides it, and a second guess in the browser is a second thing to keep in
 * step.
 */
export async function downloadApiFile(path, { params, fallbackName = 'download.xlsx' } = {}) {
  try {
    const response = await apiClient.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFrom(response.headers, fallbackName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return link.download;
  } catch (error) {
    // The server answers errors as JSON; responseType 'blob' hides that until
    // it is read back as text, and without this the user sees "[object Blob]".
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Not JSON — leave the original error alone.
      }
    }
    throw error;
  }
}

export async function openApiDocument(path, { params } = {}) {
  // Opened synchronously, before any await. A window opened after an async gap
  // is no longer attributed to the click and popup blockers stop it.
  const tab = window.open('', '_blank');

  try {
    const response = await apiClient.get(path, { params, responseType: 'blob' });
    const declared = String(response.data?.type || '').split(';')[0].trim().toLowerCase();
    const inline = INLINE_TYPES.has(declared);
    // Re-wrapped with a type chosen here, so the tab renders exactly what was
    // checked above and nothing the browser might sniff it into.
    const blob = new Blob([response.data], { type: inline ? declared : 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    if (tab && inline) {
      // The new tab gets no handle back on this page.
      tab.opener = null;
      tab.location = url;
    } else {
      // Not safe to render, or the popup was blocked: save it instead, so the
      // document is not simply lost, and leave no empty tab behind.
      tab?.close();
      saveBlobUrl(url, filenameFrom(response.headers, 'document'));
    }

    // Long enough for the tab to have loaded it; the blob would otherwise be
    // held for the life of the page.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();

    // A blob error body has to be read back as text before it means anything.
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch {
        // Not JSON — leave the original error alone.
      }
    }
    throw error;
  }
}
