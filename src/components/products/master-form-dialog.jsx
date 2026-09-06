import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Config-driven CRUD dialog for simple flat masters (UoM, HSN Code,
 * Product Category). Supports text, number, select, and radio fields with hints.
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
          ? {
              ...emptyForm,
              ...Object.fromEntries(fields.map((f) => [f.name, entity[f.name] ?? f.default ?? ''])),
              status: entity.status || 'active',
            }
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

    mutation.then(() => { toast.success(isEditing ? 'Updated' : 'Created'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to save.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${title}` : `New ${title}`}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const options = typeof field.options === 'function' ? field.options() : (field.options || []);
            return (
              <div key={field.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.name}>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.badge && (
                    <span className="text-[10px] text-muted-foreground font-mono">{field.badge}</span>
                  )}
                </div>

                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={form[field.name]}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required={field.required}
                  >
                    <option value="" disabled={field.required}>
                      {field.placeholder || `Select ${field.label.toLowerCase()}`}
                    </option>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="flex items-center gap-4 pt-1">
                    {options.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          value={opt.value}
                          checked={form[field.name] === opt.value}
                          onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || 'text'}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder}
                    value={form[field.name]}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    required={field.required}
                  />
                )}
                {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
              </div>
            );
          })}

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="master-status">Status</Label>
              <select
                id="master-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Create ${title}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
