import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Small config-driven CRUD dialog for simple flat masters (UoM, HSN Code,
 * Product Category) — these three share the exact same {text/number fields +
 * optional status-on-edit} shape, so one dialog renders all three rather than
 * three near-identical copies.
 */
export function MasterFormDialog({ open, onOpenChange, entity, title, fields, createMutation, updateMutation, buildPayload }) {
  const isEditing = !!entity;
  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']));
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        entity
          ? { ...emptyForm, ...Object.fromEntries(fields.map((f) => [f.name, entity[f.name] ?? f.default ?? ''])), status: entity.status || 'active' }
          : emptyForm
      );
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = buildPayload ? buildPayload(form) : form;

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: entity.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation.then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to save.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${title}` : `New ${title}`}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === 'select' ? (
                <select
                  id={field.name}
                  value={form[field.name]}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  required={field.required}
                >
                  <option value="" disabled>Select {field.label.toLowerCase()}</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type || 'text'}
                  value={form[field.name]}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  required={field.required}
                />
              )}
            </div>
          ))}

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Create ${title}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
