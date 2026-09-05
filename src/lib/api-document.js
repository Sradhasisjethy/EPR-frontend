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
export async function openApiDocument(path, { params } = {}) {
  // Opened synchronously, before any await. A window opened after an async gap
  // is no longer attributed to the click and popup blockers stop it.
  const tab = window.open('', '_blank');

  try {
    const response = await apiClient.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);

    if (tab) {
      tab.location = url;
    } else {
      // Popup blocked: fall back to a download so the document is not simply lost.
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      link.click();
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
