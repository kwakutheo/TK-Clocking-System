'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { can } from '@/lib/permissions';
import { CheckCircle, XCircle, Clock, FileText, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const LEAVE_TYPES = ['SICK', 'ANNUAL', 'CASUAL', 'MATERNITY', 'PATERNITY', 'OTHER'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: 'rgba(234,179,8,0.12)',  text: '#eab308' },
  APPROVED:  { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
  REJECTED:  { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
  CANCELLED: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

const TYPE_COLORS: Record<string, string> = {
  SICK: '#f97316', ANNUAL: '#3b82f6', CASUAL: '#8b5cf6',
  MATERNITY: '#ec4899', PATERNITY: '#06b6d4', OTHER: '#64748b',
};

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', background: bg, color,
    }}>{label}</span>
  );
}

function LeaveCard({ leave, isAdmin, onReview, onCancel }: {
  leave: any; isAdmin: boolean;
  onReview?: (id: string, status: 'APPROVED' | 'REJECTED', note?: string) => void;
  onCancel?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const statusColor = STATUS_COLORS[leave.status] ?? STATUS_COLORS.PENDING;
  const typeColor = TYPE_COLORS[leave.leaveType] ?? '#64748b';

  const dayCount = Math.ceil(
    (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px', transition: 'box-shadow 0.2s',
      borderLeft: `3px solid ${typeColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <Badge label={leave.leaveType} color={typeColor} bg={`${typeColor}20`} />
            <Badge label={leave.status} color={statusColor.text} bg={statusColor.bg} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {dayCount} day{dayCount !== 1 ? 's' : ''}
            </span>
          </div>

          {isAdmin && (
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
              {leave.employee?.user?.fullName ?? 'Unknown'} 
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                ({leave.employee?.employeeCode})
              </span>
            </div>
          )}

          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {leave.startDate} → {leave.endDate}
          </div>

          {leave.reason && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
              "{leave.reason}"
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {isAdmin && leave.status === 'PENDING' && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              Review {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {!isAdmin && leave.status === 'PENDING' && onCancel && (
            <button
              onClick={() => onCancel(leave.id)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Admin Review Panel */}
      {isAdmin && expanded && leave.status === 'PENDING' && (
        <div style={{
          marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Optional review note (reason for approval/rejection)..."
            rows={2}
            aria-label="Review note"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onReview?.(leave.id, 'APPROVED', reviewNote); setExpanded(false); }}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <CheckCircle size={15} /> Approve
            </button>
            <button
              onClick={() => { onReview?.(leave.id, 'REJECTED', reviewNote); setExpanded(false); }}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <XCircle size={15} /> Reject
            </button>
          </div>

          {leave.reviewedBy && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Reviewed by {leave.reviewedBy.fullName}
              {leave.reviewNote && ` — "${leave.reviewNote}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeavesPage() {
  const { user } = useAuthStore();
  const isAdmin = can(user?.role, 'leaves.manage');

  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    leaveType: 'SICK', startDate: '', endDate: '', reason: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchMyLeaves = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/leaves/my`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setMyLeaves(await res.json());
  }, [token]);

  const fetchAllLeaves = useCallback(async () => {
    if (!token || !isAdmin) return;
    const url = filterStatus === 'ALL' ? `${API}/leaves` : `${API}/leaves?status=${filterStatus}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAllLeaves(await res.json());
  }, [token, isAdmin, filterStatus]);

  useEffect(() => { fetchMyLeaves(); }, [fetchMyLeaves]);
  useEffect(() => { fetchAllLeaves(); }, [fetchAllLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) { setError('Start and end dates are required.'); return; }
    if (form.endDate < form.startDate) { setError('End date cannot be before start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Failed to submit leave'); }
      setSuccess('Leave request submitted successfully!');
      setShowForm(false);
      setForm({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' });
      fetchMyLeaves();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) => {
    try {
      const res = await fetch(`${API}/leaves/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reviewNote }),
      });
      if (!res.ok) throw new Error('Failed to review leave');
      setSuccess(`Leave ${status.toLowerCase()} successfully.`);
      fetchAllLeaves();
    } catch (err: any) { setError(err.message); }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${API}/leaves/${id}/cancel`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to cancel leave');
      setSuccess('Leave request cancelled.');
      fetchMyLeaves();
    } catch (err: any) { setError(err.message); }
  };

  const pendingCount = allLeaves.filter(l => l.status === 'PENDING').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={26} /> Leave Requests
          </h1>
          <p className="page-subtitle">
            {isAdmin ? 'Review and manage staff leave requests' : 'Submit and track your personal leave requests'}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> Request Leave
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
        }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
        }}>
          <CheckCircle size={16} /> {success}
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Request Leave Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ margin: '0 0 18px', color: 'var(--text-primary)', fontSize: 16 }}>New Leave Request</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  aria-label="Leave type"
                  style={{
                    padding: '10px 14px', borderRadius: 8, background: 'var(--bg-input)',
                    border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13,
                  }}
                >
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  aria-label="Start date"
                  style={{
                    padding: '10px 14px', borderRadius: 8, background: 'var(--bg-input)',
                    border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13,
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                  aria-label="End date"
                  style={{
                    padding: '10px 14px', borderRadius: 8, background: 'var(--bg-input)',
                    border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13,
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Reason (optional)
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                placeholder="Describe the reason for your leave..."
                aria-label="Reason"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Submitting...</> : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: '10px 20px', borderRadius: 8, background: 'var(--bg-card-hover)',
                border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Admin Panel ─────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              All Leave Requests
              {pendingCount > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                  {pendingCount} pending
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: filterStatus === s ? 'var(--primary)' : 'var(--bg-card)',
                    color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                    border: filterStatus === s ? 'none' : '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {allLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
              <Clock size={36} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              No {filterStatus === 'ALL' ? '' : filterStatus.toLowerCase()} leave requests found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allLeaves.map(leave => (
                <LeaveCard key={leave.id} leave={leave} isAdmin onReview={handleReview} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My Leaves Panel ──────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          My Leave Requests
        </h2>
        {myLeaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            <FileText size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
            You have no leave requests yet. Click "Request Leave" to submit one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myLeaves.map(leave => (
              <LeaveCard key={leave.id} leave={leave} isAdmin={false} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
