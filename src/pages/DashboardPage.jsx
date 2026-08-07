import { Users, Building2, Briefcase, Layers, MapPin } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { useDashboardStats } from '@/hooks/use-dashboard';

export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
        <p>Failed to load dashboard statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Employees" value={stats.totalEmployees.toLocaleString()} icon={Users} trend={0} />
        <StatCard title="Active Organizations" value={stats.activeOrgs.toLocaleString()} icon={Building2} trend={0} />
        <StatCard title="Departments" value={stats.departments.toLocaleString()} icon={Layers} trend={0} />
        <StatCard title="Offices" value={stats.offices.toLocaleString()} icon={MapPin} trend={0} />
        <StatCard title="Roles" value={stats.roles.toLocaleString()} icon={Briefcase} trend={0} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm glass-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
