import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openApiDocument } from './api-document';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

/**
 * The challan and job-card prints were plain <a href> links built from the API
 * base URL. VITE_API_URL points at another origin, and a browser does not send
 * cookies with a cross-origin link navigation — so the request arrived with no
 * credential and the API answered "Access token is missing", while every other
 * call on the same page worked.
 */
describe('openApiDocument', () => {
  let openedTab;

  beforeEach(() => {
    apiClient.get.mockReset();
    openedTab = { location: null, close: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => openedTab));
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:generated'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches through the API client, so the cookie is sent', async () => {
    apiClient.get.mockResolvedValue({ data: new Blob(['%PDF-'], { type: 'application/pdf' }) });

    await openApiDocument('/dispatch/challans/c1/print', { params: { format: 'a4' } });

    // Through axios (withCredentials) rather than a bare navigation.
    expect(apiClient.get).toHaveBeenCalledWith(
      '/dispatch/challans/c1/print',
      expect.objectContaining({ params: { format: 'a4' }, responseType: 'blob' })
    );
  });

  it('opens the tab before awaiting, so it is not treated as a popup', async () => {
    let resolveRequest;
    apiClient.get.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));

    const pending = openApiDocument('/x');

    // The window must exist before the request settles: a window opened after
    // an async gap is no longer attributed to the click and gets blocked.
    expect(window.open).toHaveBeenCalledWith('', '_blank');

    resolveRequest({ data: new Blob(['%PDF-'], { type: 'application/pdf' }) });
    await pending;
    expect(openedTab.location).toBe('blob:generated');
  });

  it('closes the blank tab when the request fails', async () => {
    apiClient.get.mockRejectedValue({ response: { data: { message: 'Nope' } } });

    await expect(openApiDocument('/x')).rejects.toBeTruthy();
    // Otherwise the user is left staring at an empty tab.
    expect(openedTab.close).toHaveBeenCalled();
  });

  it('reads a blob error body back into something readable', async () => {
    // The server answers errors as JSON, but responseType 'blob' means the
    // message arrives as a Blob and would otherwise surface as "[object Blob]".
    const body = new Blob([JSON.stringify({ message: 'Access token is missing' })]);
    apiClient.get.mockRejectedValue({ response: { data: body } });

    await expect(openApiDocument('/x')).rejects.toMatchObject({
      response: { data: { message: 'Access token is missing' } },
    });
  });

  it('falls back to a download when the popup is blocked', async () => {
    vi.stubGlobal('open', vi.fn(() => null));
    apiClient.get.mockResolvedValue({ data: new Blob(['%PDF-'], { type: 'application/pdf' }) });

    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await openApiDocument('/x');

    // A blocked popup must not mean the document is silently lost.
    expect(click).toHaveBeenCalled();
    expect(click.mock.contexts[0].getAttribute('href')).toBe('blob:generated');
    click.mockRestore();
  });

  /**
   * A blob: URL carries this app's origin, and a tab navigated to one ignores
   * the server's attachment and nosniff headers. An employee document stored
   * as text/html before the type filter existed would run as the app itself.
   */
  describe('only renders types that cannot run script', () => {
    let click;
    beforeEach(() => {
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });
    afterEach(() => click.mockRestore());

    it('does not navigate the tab to an HTML blob — it is saved instead', async () => {
      apiClient.get.mockResolvedValue({
        data: new Blob(['<script>alert(1)</script>'], { type: 'text/html' }),
        headers: { 'content-disposition': `attachment; filename="x.html"; filename*=UTF-8''x.html` },
      });

      await openApiDocument('/users/u1/documents/d1/file');

      expect(openedTab.location).toBeNull();
      expect(openedTab.close).toHaveBeenCalled();
      expect(click).toHaveBeenCalledTimes(1);
      const link = click.mock.contexts[0];
      expect(link.getAttribute('download')).toBe('x.html');
      // Re-wrapped as an opaque type, whatever the response claimed.
      expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/octet-stream');
    });

    it('does not navigate to an SVG blob either', async () => {
      apiClient.get.mockResolvedValue({ data: new Blob(['<svg onload="alert(1)"/>'], { type: 'image/svg+xml' }) });

      await openApiDocument('/x');

      expect(openedTab.location).toBeNull();
      expect(click).toHaveBeenCalled();
    });

    it('still opens a PDF inline, cut off from this page', async () => {
      apiClient.get.mockResolvedValue({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) });

      await openApiDocument('/invoices/i1/print');

      expect(openedTab.location).toBe('blob:generated');
      expect(openedTab.opener).toBeNull();
      expect(openedTab.close).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
      expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/pdf');
    });

    it('opens a PNG inline too', async () => {
      apiClient.get.mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }) });

      await openApiDocument('/x');

      expect(openedTab.location).toBe('blob:generated');
    });
  });
});
