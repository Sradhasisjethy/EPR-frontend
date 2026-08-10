import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { Building2, MapPin, Network, Users, Calendar, Hash } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function OrganizationDetailDialog({ open, onOpenChange, data, type }) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] glass-card border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                {type === 'office' ? <MapPin size={22} /> : type === 'department' ? <Network size={22} /> : <Building2 size={22} />}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{data.name}</DialogTitle>
                <p className="text-xs text-muted-foreground capitalize">{type} Details</p>
              </div>
            </div>
            <StatusBadge status={data.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4 text-sm">
          {/* Organization Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-primary" /> Organization
              </span>
              <p className="font-semibold text-foreground mt-1">
                {data.Organization?.name || data.organization?.name || 'Acme Global'}
                {(data.Organization?.code || data.organization?.code) && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
                    {data.Organization?.code || data.organization?.code}
                  </span>
                )}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={13} className="text-primary" /> Code
              </span>
              <p className="font-semibold text-foreground mt-1">{data.code || 'N/A'}</p>
            </div>
          </div>

          {/* Type Specific Fields */}
          {type === 'office' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary" /> Location & Address
                </span>
                <p className="font-medium text-foreground">
                  {[data.address, data.city, data.state, data.country].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>

              {data.allDepartments && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Network size={13} className="text-primary" /> Departments Operating Here
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {data.allDepartments.length > 0 ? (
                      data.allDepartments.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                          <span>📁 {d.name}</span>
                          {d.code && <span className="text-[10px] opacity-75">({d.code})</span>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No specific departments mapped yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'department' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} className="text-primary" /> Primary Office
                  </span>
                  <p className="font-medium text-foreground">
                    📍 {data.Office ? `${data.Office.name} (${data.Office.city || 'HQ'})` : 'Global / All Offices'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Network size={13} className="text-primary" /> Level
                  </span>
                  <p className="font-medium text-foreground">
                    {data.parentId ? `Sub-Department (Parent: ${data.parentDepartment?.name || 'Parent'})` : 'Main Department'}
                  </p>
                </div>
              </div>

              {data.subDepartments && data.subDepartments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Network size={13} className="text-primary" /> Sub-Departments ({data.subDepartments.length})
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {data.subDepartments.map((sub) => (
                      <div key={sub.id} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                        └─ {sub.name} ({sub.code || 'NO CODE'})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
            <span className="flex items-center gap-1">
              <Calendar size={13} /> Created: {data.createdAt ? formatDate(data.createdAt) : 'N/A'}
            </span>
            <span>ID: {data.id?.slice(0, 8)}...</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
