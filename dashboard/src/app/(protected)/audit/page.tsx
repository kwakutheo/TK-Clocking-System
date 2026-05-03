'use client';
import useSWR from 'swr';
import { auditApi } from '@/lib/api';
import { format } from 'date-fns';
import { ShieldCheck, User, Info, Calendar } from 'lucide-react';

const fetcher = () => auditApi.list().then((r) => r.data);

export default function AuditLogsPage() {
  const { data, isLoading } = useSWR('audit-logs', fetcher);
  const logs: any[] = data ?? [];

  const formatJson = (val: any) => {
    if (!val) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    return (
      <pre style={{ 
        fontSize: 11, 
        margin: 0, 
        padding: '8px', 
        background: '#07090f', 
        color: 'var(--text-primary)',
        lineHeight: '1.5',
        borderRadius: '6px', 
        border: '1px solid var(--border)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        {JSON.stringify(val, null, 2)}
      </pre>
    );
  };

  const getActionColor = (action: string) => {
    if (action.includes('UPDATE')) return '#0ea5e9';
    if (action.includes('MANUAL')) return '#f59e0b';
    if (action.includes('CREATE')) return '#10b981';
    if (action.includes('DELETE')) return '#ef4444';
    return '#64748b';
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">System Audit Logs</h1>
        <p className="page-subtitle">Compliance tracking of all administrative changes</p>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <ShieldCheck size={20} style={{ marginRight: 8, color: 'var(--primary)' }} />
          <span className="table-title">Recent Activities</span>
        </div>

        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-text">No audit logs found yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 1200 }}>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Timestamp</th>
                  <th style={{ width: 150 }}>Admin User</th>
                  <th style={{ width: 180 }}>Action</th>
                  <th style={{ width: 120 }}>Module</th>
                  <th>Changes (Old → New)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                          {(log.user?.fullName ?? '?').split(' ').map((w: any) => w[0]).join('')}
                        </div>
                        <span style={{ fontSize: 13 }}>{log.user?.fullName}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        background: `${getActionColor(log.action)}15`, 
                        color: getActionColor(log.action),
                        border: `1px solid ${getActionColor(log.action)}30`
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 12, fontWeight: 500 }}>{log.module}</span></td>
                    <td>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>OLD VALUES</div>
                          {formatJson(log.oldValues)}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>NEW VALUES</div>
                          {formatJson(log.newValues)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
