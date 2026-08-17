import { Users, Building2, Briefcase, Layers, MapPin } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { useDashboardStats } from '@/hooks/use-dashboard';

import { DashboardSkeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !stats) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl border border-destructive/20 text-destructive">
        <p>Failed to load dashboard statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Industrial Plant Overview Header Banner */}
      <div className="p-6 rounded-2xl glass-card border border-white/40 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-slate-500/5 to-transparent dark:from-blue-900/30 dark:via-slate-900/40 dark:to-slate-950/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
              🏭 Industrial ERP 4.0
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">System Online</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Plant & Operations Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">Real-time overview of workforce, facilities, and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Employees" value={stats.totalEmployees.toLocaleString()} icon={Users} trend={0} variant="blue" />
        <StatCard title="Active Organizations" value={stats.activeOrgs.toLocaleString()} icon={Building2} trend={0} variant="emerald" />
        <StatCard title="Departments" value={stats.departments.toLocaleString()} icon={Layers} trend={0} variant="purple" />
        <StatCard title="Offices" value={stats.offices.toLocaleString()} icon={MapPin} trend={0} variant="amber" />
        <StatCard title="Roles" value={stats.roles.toLocaleString()} icon={Briefcase} trend={0} variant="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="p-6 rounded-2xl border border-white/40 dark:border-white/10 glass-card">
          <div className="flex items-center justify-between mb-5 border-b border-slate-200/50 dark:border-white/10 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              Recent Audit Activity
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live Feed</span>
          </div>
          <div className="space-y-4">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 group p-2.5 rounded-xl hover:bg-slate-500/10 transition-colors">
                  <div className="w-3 h-3 mt-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activity.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No recent activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
