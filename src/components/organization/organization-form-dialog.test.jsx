import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { OrganizationFormDialog } from './organization-form-dialog';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(() => Promise.resolve({ data: { data: [] } })), post: vi.fn(), put: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const open = () => renderWithQuery(<OrganizationFormDialog open onOpenChange={() => {}} />);

describe('OrganizationFormDialog logo upload', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
  });

  it('uploads the chosen image and shows the preview', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { data: { url: '/uploads/logos/logo-abc123.png' } },
    });
    const user = userEvent.setup();
    open();

    const file = new File(['fake-png-bytes'], 'logo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload logo'), file);

    // One multipart POST to the logo endpoint, carrying the file under 'logo'
    // — the field name the backend's multer.single('logo') expects.
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/organizations/logo');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('logo')).toBe(file);

    // The preview renders from the path the server issued.
    const preview = await screen.findByAltText('Company logo');
    expect(preview).toHaveAttribute('src', '/uploads/logos/logo-abc123.png');
    expect(screen.getByText('Change Logo')).toBeInTheDocument();
  });

  it('keeps the form logo-less when the server refuses the file', async () => {
    apiClient.post.mockRejectedValueOnce({
      response: { data: { message: 'Only JPEG, PNG or WEBP images are allowed' } },
    });
    const user = userEvent.setup();
    open();

    const file = new File(['not-an-image'], 'x.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload logo'), file);

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByAltText('Company logo')).not.toBeInTheDocument();
    expect(screen.getByText('Upload Logo')).toBeInTheDocument();
  });

  it('sends the logo path with the create payload', async () => {
    apiClient.post
      .mockResolvedValueOnce({ data: { data: { url: '/uploads/logos/logo-abc123.png' } } }) // upload
      .mockResolvedValueOnce({ data: { data: { id: 'org-1' } } }); // create
    const user = userEvent.setup();
    open();

    await user.type(screen.getByLabelText(/Legal Name/i), 'Infideep Precast Pvt Ltd');
    await user.type(screen.getByLabelText(/^Code/i), 'IFP');
    await user.type(screen.getByLabelText(/GSTIN/i), '21ABCDE1234F1Z5');
    await user.type(screen.getByLabelText(/Address Line 1/i), 'Plot 12, Industrial Estate');
    await user.type(screen.getByLabelText(/City \/ District/i), 'Bhubaneswar');
    await user.selectOptions(screen.getByLabelText(/^State/i), '21');
    await user.type(screen.getByLabelText(/PIN Code/i), '751024');
    await user.type(screen.getByLabelText(/Official Email/i), 'accounts@infideep.in');
    await user.type(screen.getByLabelText(/Official Phone/i), '9437000000');
    await user.upload(screen.getByLabelText('Upload logo'), new File(['img'], 'logo.png', { type: 'image/png' }));
    await screen.findByAltText('Company logo');

    await user.click(screen.getByRole('button', { name: /Create Organization/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    const [createUrl, payload] = apiClient.post.mock.calls[1];
    expect(createUrl).toBe('/organizations');
    expect(payload.logo).toBe('/uploads/logos/logo-abc123.png');
    // The GSTIN filled PAN and the state code rode along with the state.
    expect(payload.pan).toBe('ABCDE1234F');
    expect(payload.stateCode).toBe('21');
    expect(payload.state).toBe('Odisha');
  });
});
