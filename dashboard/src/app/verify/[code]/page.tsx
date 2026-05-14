'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function VerifyReportPage() {
  const params = useParams();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const verifyCode = async () => {
      try {
        const res = await api.get(`/attendance/verify/${code}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired verification code.');
      } finally {
        setLoading(false);
      }
    };

    verifyCode();
  }, [code]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Verifying Official Document...</div>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ background: 'white', padding: 40, borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Verification Failed</h1>
          <p style={{ color: '#ef4444', marginBottom: 24 }}>{error}</p>
          <p style={{ color: '#6b7280', fontSize: 14 }}>This report may have been tampered with or is not an official system document.</p>
        </div>
      </div>
    );
  }

  const { data: reportData, verifiedAt } = data;

  const renderData = () => {
    if (reportData.type === 'monthly' || reportData.type === 'term') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Hours</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{reportData.summary.totalHours}h</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Days Worked</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{reportData.summary.daysWorked}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Days Absent</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{reportData.summary.daysAbsent}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Days Late</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{reportData.summary.daysLate}</div>
          </div>
        </div>
      );
    }

    if (reportData.type === 'bulk_monthly' || reportData.type === 'bulk_term') {
      return (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 12 }}>
            <strong>{reportData.reports.length}</strong> employees included in this summary.
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Employee</th>
                  <th style={{ padding: '12px 16px' }}>Hrs</th>
                </tr>
              </thead>
              <tbody>
                {reportData.reports.slice(0, 5).map((r: any, idx: number) => (
                  <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14 }}>{r.employee?.fullName || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 14 }}>{r.summary?.totalHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.reports.length > 5 && (
              <div style={{ padding: 12, textAlign: 'center', fontSize: 13, color: '#6b7280', borderTop: '1px solid #e2e8f0' }}>
                + {reportData.reports.length - 5} more records
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const getTitle = () => {
    switch (reportData.type) {
      case 'monthly': return `Monthly Report: ${reportData.month}/${reportData.year}`;
      case 'term': return 'Term Report';
      case 'bulk_monthly': return reportData.title;
      case 'bulk_term': return reportData.title;
      default: return 'Official Report';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', maxWidth: 480, width: '100%', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'var(--primary, #2563eb)', padding: '32px 24px', textAlign: 'center', color: 'white' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>✅</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Official Document Verified</h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: 15 }}>TK Clocking System</p>
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: '#6b7280', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Document Type</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{getTitle()}</div>
          </div>

          {(reportData.type === 'monthly' || reportData.type === 'term') && reportData.employee && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#6b7280', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Employee Name</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{reportData.employee.fullName}</div>
              {reportData.employee.employeeCode && (
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{reportData.employee.employeeCode}</div>
              )}
            </div>
          )}

          <div style={{ height: 1, background: '#e5e7eb', margin: '24px 0' }} />

          <div>
            <div style={{ color: '#6b7280', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Official Summary</div>
            {renderData()}
          </div>

          <div style={{ height: 1, background: '#e5e7eb', margin: '24px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <div style={{ color: '#6b7280' }}>
              <div>Reference Code</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#111827', marginTop: 4 }}>{code}</div>
            </div>
            <div style={{ textAlign: 'right', color: '#6b7280' }}>
              <div>Generated On</div>
              <div style={{ fontWeight: 500, color: '#111827', marginTop: 4 }}>
                {new Date(verifiedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: 20, textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            If the data on the printed document differs from what is shown here, the document has been tampered with.
          </p>
        </div>
      </div>
    </div>
  );
}
