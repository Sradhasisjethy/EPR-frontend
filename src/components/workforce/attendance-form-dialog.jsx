import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMarkAttendance } from '@/hooks/use-workforce';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

export function AttendanceFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', labourPartyId: '', attendanceDate: '', status: 'PRESENT', overtimeHours: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: labourData } = useParties({ page: 1, limit: 100, partyType: PartyType.LABOUR });
  const createMutation = useMarkAttendance();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', labourPartyId: '', attendanceDate: today(), status: 'PRESENT', overtimeHours: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      factoryId: form.factoryId,
      labourPartyId: form.labourPartyId,
      attendanceDate: form.attendanceDate,
      status: form.status,
      ...(form.status === 'OVERTIME' ? { overtimeHours: Number(form.overtimeHours || 0) } : {}),
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Attendance recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to mark attendance.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Factory</Label>
            <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select factory</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Labourer</Label>
            <select value={form.labourPartyId} onChange={(e) => setForm({ ...form, labourPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select labourer</option>
              {(labourData?.rows || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.attendanceDate} onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="PRESENT">Present</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="OVERTIME">Overtime</option>
              </select>
            </div>
          </div>
          {form.status === 'OVERTIME' && (
            <div className="space-y-1.5">
              <Label>Overtime Hours</Label>
              <Input type="number" step="0.5" min="0" value={form.overtimeHours} onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })} required />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Mark Attendance'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
