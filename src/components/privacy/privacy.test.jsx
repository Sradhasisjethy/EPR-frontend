import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';
import { apiClient } from '@/lib/api-client';
import { NoticeView } from './notice-view';
import PublicPrivacyPage from '@/pages/PublicPrivacyPage';

vi.mock('@/lib/api-client', () => {
  const client = { get: vi.fn(), post: vi.fn() };
  // The public page uses publicClient; the same mocks serve both.
  return { apiClient: client, publicClient: client };
});

const NOTICE = {
  version: 3,
  title: 'How we use personal data',
  language: 'English',
  summary: 'We collect only what we need.',
  publishedAt: '2026-10-01T05:00:00.000Z',
  purposes: [
    { code: 'EMPLOYMENT_ADMIN', label: 'Employment administration', description: 'Staff records', dataItems: ['Name'], principalTypes: ['USER'], lawfulBasis: 'LEGITIMATE_USE' },
    { code: 'MARKETING', label: 'Offers and product updates', description: 'Offers', dataItems: ['Phone'], principalTypes: ['LEAD', 'PARTY'], lawfulBasis: 'CONSENT', optional: true },
  ],
  processors: [{ name: 'Brevo (email delivery)', purpose: 'Sends emails', location: 'EU' }],
};

describe('NoticeView', () => {
  it('shows a staff member only the purposes that apply to staff', () => {
    renderWithQuery(<NoticeView notice={NOTICE} principalType="USER" />);
    expect(screen.getByText('Employment administration')).toBeInTheDocument();
    expect(screen.queryByText('Offers and product updates')).not.toBeInTheDocument();
  });

  it('names the contact and the right to complain to the Board', () => {
    renderWithQuery(<NoticeView notice={NOTICE} contact={{ name: 'Priya', email: 'privacy@plant.test' }} responseDays={30} />);
    expect(screen.getByText(/privacy@plant\.test/)).toBeInTheDocument();
    expect(screen.getByText(/Data\s+Protection Board of India/)).toBeInTheDocument();
    expect(screen.getByText(/within 30 days/)).toBeInTheDocument();
  });
});

describe('PublicPrivacyPage', () => {
  const open = () =>
    renderWithQuery(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes><Route path="/privacy" element={<PublicPrivacyPage />} /></Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('shows the whole policy at once, even when the server does not answer', async () => {
    apiClient.get.mockRejectedValue({ code: 'ECONNABORTED' });
    open();
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    for (const heading of ['1. Introduction', '5. Why we process it, and on what basis', '11. Your rights', '12. Children', '14. Personal data breaches', '15. Contact us and grievances']) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    // Built-in purposes stand in until a notice is published.
    expect(screen.getByText('Engaging and paying labour and contractors')).toBeInTheDocument();
    expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument();
  });

  it("uses what the owner published where it overlaps: contact, purposes, version", async () => {
    apiClient.get.mockResolvedValue({
      data: { data: { contact: { name: 'Priya', designation: 'Grievance Officer', email: 'privacy@platform.test' }, responseDays: 21, notice: NOTICE } },
    });
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'How we use personal data' })).toBeInTheDocument();
    expect(screen.getByText('privacy@platform.test')).toBeInTheDocument();
    expect(screen.getByText(/Version 3/)).toBeInTheDocument();
    expect(screen.getByText('Offers and product updates')).toBeInTheDocument();
    expect(screen.queryByText('Engaging and paying labour and contractors')).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/public/privacy');
  });

  it('takes a request from someone with no login and gives back only a reference', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { contact: {}, responseDays: 30, notice: NOTICE } } });
    apiClient.post.mockResolvedValue({ data: { data: { reference: 'DPR/2026/0007', dueDate: '2026-11-13' } } });
    open();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ramesh Worker' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9111111111' } });
    fireEvent.change(screen.getByLabelText('Which business do you deal with?'), { target: { value: 'Infideep Precast' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(screen.getByText('DPR/2026/0007')).toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledWith('/public/privacy/requests', expect.objectContaining({
      requesterName: 'Ramesh Worker', requesterOrganisation: 'Infideep Precast', type: 'ACCESS',
    }));
  });

  it('says so when a request cannot be sent', async () => {
    apiClient.get.mockRejectedValue({ code: 'ECONNABORTED' });
    apiClient.post.mockRejectedValue({ code: 'ECONNABORTED' });
    open();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ramesh Worker' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9111111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be sent/);
  });
});
