'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { attendanceApi, employeesApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { AttendanceChart } from '@/components/attendance-chart';
import { ActivityFeed } from '@/components/activity-feed';
import { StatCardSkeleton, TableSkeleton } from '@/components/skeleton';
import {
  TrendingUp, TrendingDown, Users, FileText, Building2, Clock, Calendar, AlertTriangle,
} from 'lucide-react';

const fetcher = (fn: () => Promise<unknown>) => () => fn().then((r: any) => r.data);

// Parses a 'yyyy-MM-dd' string as LOCAL midnight, avoiding UTC timezone shift errors.
// Returns null for incomplete/invalid strings (e.g. when user is mid-typing).
function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // Check the date actually round-trips (guards against e.g. Feb 30)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function StatCard({
  icon,
  value,
  label,
  color,
  trend,
  trendUp,
  secondary,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  trend?: string;
  trendUp?: boolean;
  secondary?: string;
}) {
  return (
    <div className="stat-card" style={{ ['--stat-color' as any]: color, ['--stat-color-dim' as any]: `${color}15` }}>
      <div className="stat-card-glow" />
      <div className="stat-card-content">
        <div className="stat-icon-wrapper">
          <div className="stat-icon">{icon}</div>
          {trend && (
            <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
              {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend}
            </div>
          )}
        </div>
        <div className="stat-main">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
        {secondary && <div className="stat-secondary">{secondary}</div>}
      </div>
    </div>
  );
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    clock_in: 'Clock In', clock_out: 'Clock Out',
    break_in: 'Break In', break_out: 'Break Out',
  };
  return map[type] ?? type;
}

function typeBadge(type: string) {
  if (type === 'clock_in') return 'badge-green';
  if (type === 'clock_out') return 'badge-red';
  if (type === 'break_in') return 'badge-blue';
  return 'badge-amber';
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const { data: live, isLoading: liveLoading } = useSWR(
    ['live', selectedDate], 
    fetcher(() => attendanceApi.live(isToday ? undefined : selectedDate)), 
    { refreshInterval: isToday ? 30_000 : 0 }
  );
  const { data: stats, isLoading: statsLoading } = useSWR(
    ['attendance-stats', selectedDate], 
    fetcher(() => attendanceApi.stats(isToday ? undefined : selectedDate)), 
    { refreshInterval: isToday ? 30_000 : 0 }
  );
  const { data: employees, isLoading: empLoading } = useSWR('employees', fetcher(() => employeesApi.list()));
  const { data: branches, isLoading: branchLoading } = useSWR('branches', fetcher(() => branchesApi.list()));

  const liveList: any[] = live ?? [];
  const employeeList: any[] = employees ?? [];
  const branchList: any[] = branches ?? [];
  const dashboardStats = stats ?? { totalUniqueAttendance: 0, currentlyOnSite: 0 };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const isLoading = liveLoading || empLoading || statsLoading || branchLoading;

  const activeBranchNames = branchList.slice(0, 2).map(b => b.name).join(' & ') + (branchList.length > 2 ? ` + ${branchList.length - 2} more` : '');

  return (
    <div className="dashboard-container">
      <div className="page-header dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            {greeting}, <span className="text-gradient">{user?.fullName.split(' ')[0]}</span>
          </h1>
          <p className="page-subtitle">
            {(() => {
              const d = parseLocalDate(selectedDate);
              return d ? format(d, 'EEEE, MMMM d, yyyy') : selectedDate;
            })()} · 
            {isToday ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}> ● Live</span>
            ) : (
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}> ● Historical</span>
            )} Workforce Overview
          </p>
        </div>
        <div style={{ marginRight: '80px' }}>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => {
              const val = e.target.value;
              const parsed = parseLocalDate(val);
              if (!parsed) return;
              const today = parseLocalDate(format(new Date(), 'yyyy-MM-dd'))!;
              // Clamp future dates to today
              setSelectedDate(parsed > today ? format(new Date(), 'yyyy-MM-dd') : val);
            }}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="input-field"
            aria-label="Select date for attendance history"
            title="Select date for attendance history"
            style={{ width: 'auto', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Stats */}
      {dashboardStats.dayStatus?.isNonWorking && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--primary-color-dim)',
          border: '1px solid var(--primary-color)',
          borderRadius: 12,
          marginBottom: 24,
          color: 'var(--primary-color)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Calendar size={20} />
          {isToday ? 'Today is' : 'This was'} a non-working day: {dashboardStats.dayStatus.name}
        </div>
      )}
      
      <div className="stats-grid">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            {isToday && <StatCardSkeleton />}
          </>
        ) : (
          <>
            <StatCard
              icon={<Clock size={20} />}
              value={dashboardStats.currentlyOnSite}
              label={isToday ? "Currently at work" : "Total Present"}
              color="#10b981"
              trendUp={true}
              secondary={isToday ? "Active clock-ins right now" : "Total employees who clocked in"}
            />
            <StatCard
              icon={<TrendingDown size={20} />}
              value={dashboardStats.lateArrivals ?? 0}
              label="Late Arrivals"
              color="#f43f5e"
              secondary="Employees who arrived late"
            />
            <StatCard
              icon={<Users size={20} />}
              value={dashboardStats.absentToday ?? 0}
              label={isToday ? "Absent Today" : "Absent"}
              color="#f59e0b"
              secondary={isToday ? "Expected but not clocked in" : "Expected but didn't clock in"}
            />
            <StatCard
              icon={<Clock size={20} />}
              value={dashboardStats.earlyOuts ?? 0}
              label="Early Outs"
              color="#f97316"
              secondary="Left before shift ended"
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              value={dashboardStats.forgotClockOut ?? 0}
              label="Forgot Out"
              color="#a1887f"
              secondary="Missing clock-out logs"
            />
            {isToday && (
              <StatCard
                icon={<Building2 size={20} />}
                value={employeeList.length}
                label="Total Employees"
                color="#3b82f6"
                secondary="Registered in workforce"
              />
            )}
          </>
        )}
      </div>

      <div className="dashboard-content-grid">
        <div className="table-wrap" style={{ padding: '20px 24px' }}>
          <div className="table-header" style={{ padding: '0 0 16px', borderBottom: 'none' }}>
            <span className="table-title">Attendance Overview</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isToday ? 'Today' : 'Date'} by hour</span>
          </div>
          {isLoading ? (
            <div className="loading-center" style={{ padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : (
            <AttendanceChart data={liveList} />
          )}
        </div>

        {isToday && (
          <div className="table-wrap" style={{ padding: '20px 0' }}>
            <div className="table-header" style={{ padding: '0 24px 12px' }}>
              <span className="table-title">Recent Activity</span>
            </div>
            {isLoading ? (
              <div className="loading-center" style={{ padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : (
              <ActivityFeed logs={liveList} />
            )}
          </div>
        )}
      </div>

      {/* Live attendance feed */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="table-wrap">
          <div className="table-header">
            <span className="table-title">
              {isToday && <span className="live-dot" style={{ marginRight: 8 }} />}
              {isToday ? 'Live Attendance Feed' : 'Attendance Log'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isToday && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Auto-syncing
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {liveList.length} events {isToday ? 'today' : 'on this date'}
              </span>
            </div>
          </div>

          {liveList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Clock size={42} /></div>
              <p className="empty-state-text">No attendance recorded {isToday ? 'today' : 'on this date'} yet.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Event</th>
                  <th>Branch</th>
                  <th>Time</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {liveList.map((log: any) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">
                          {(log.employee?.user?.fullName ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{log.employee?.user?.fullName ?? 'Unknown'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{log.employee?.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${typeBadge(log.type)}`}>{typeLabel(log.type)}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.branch?.name ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{format(new Date(log.timestamp), 'HH:mm:ss')}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {log.latitude ? `${Number(log.latitude).toFixed(4)}, ${Number(log.longitude).toFixed(4)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
