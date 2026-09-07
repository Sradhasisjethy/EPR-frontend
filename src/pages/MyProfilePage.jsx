import { useCurrentUser } from '@/hooks/use-auth';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import { EmployeeDocumentsTab } from '@/components/employees/employee-documents-tab';
import { User, Mail, Shield, Building2, MapPin, Laptop, Calendar } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { DateText } from '@/components/date-text';

export default function MyProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const { glassMode } = useUIStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Failed to load profile.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal details and upload documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cn('col-span-1 rounded-xl border border-border p-6 space-y-6 h-fit', glassMode ? 'glass-card' : 'bg-card')}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="text-center">
              <h2 className="font-semibold text-lg">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User size={16} className="text-primary/70" />
              <span>{user.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail size={16} className="text-primary/70" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield size={16} className="text-primary/70" />
              <span>{user.role}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Building2 size={16} className="text-primary/70" />
              <span>{user.status || 'Active'}</span>
            </div>
            {user.dateOfJoining && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar size={16} className="text-primary/70" />
                <span>Joined {<DateText value={user.dateOfJoining} />}</span>
              </div>
            )}
            {(user.assetName || user.assetCode) && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Laptop size={16} className="text-primary/70" />
                <span>{user.assetName || 'Asset'}{user.assetCode ? ` (${user.assetCode})` : ''}</span>
              </div>
            )}
            {([user.address, user.city, user.state, user.pincode, user.country].some(Boolean)) && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin size={16} className="text-primary/70 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {[user.address, user.city, user.state, user.pincode ? `PIN: ${user.pincode}` : null, user.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={cn('col-span-1 md:col-span-2 rounded-xl border border-border p-6', glassMode ? 'glass-card' : 'bg-card')}>
          <h2 className="text-lg font-semibold mb-6">My Documents</h2>
          <EmployeeDocumentsTab employeeId={user.id} />
        </div>
      </div>
    </div>
  );
}
