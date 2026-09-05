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
    apiClient.get.mockResolvedValue({ data: new Blob(['pdf']) });

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

    resolveRequest({ data: new Blob(['pdf']) });
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
    apiClient.get.mockResolvedValue({ data: new Blob(['pdf']) });

    const click = vi.fn();
    const link = { href: '', download: '', click };
    vi.spyOn(document, 'createElement').mockReturnValue(link);

    await openApiDocument('/x');

    // A blocked popup must not mean the document is silently lost.
    expect(click).toHaveBeenCalled();
    expect(link.href).toBe('blob:generated');
    document.createElement.mockRestore();
  });
});
