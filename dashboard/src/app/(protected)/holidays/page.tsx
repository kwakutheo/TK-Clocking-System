'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { holidaysApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Trash2, Edit, ShieldAlert } from 'lucide-react';
import { can } from '@/lib/permissions';
import { useAuthStore } from '@/lib/store';
import { useMemo } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';

const fetcher = () => holidaysApi.list().then((r) => r.data);

export default function HolidaysPage() {
  const { data, isLoading, mutate } = useSWR('holidays-list', fetcher);
  const { user } = useAuthStore();
  const holidays: any[] = data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [alertData, setAlertData] = useState<{ title: string; msg: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const userRole = useMemo(() => user?.role, [user]);

  if (!can(userRole, 'holidays.manage')) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--danger)' }}><ShieldAlert size={48} /></div>
        <p className="empty-state-text">Access Denied. You do not have permission to manage holidays.</p>
      </div>
    );
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await holidaysApi.update(editingId, form);
      } else {
        await holidaysApi.create(form);
      }
      mutate();
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', date: '', isRecurring: true });
    } catch (err) {
      setAlertData({ title: 'Error', msg: editingId ? 'Failed to update holiday' : 'Failed to add holiday', variant: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await holidaysApi.delete(deleteConfirm);
      mutate();
    } catch (err) {
      setAlertData({ title: 'Error', msg: 'Failed to delete holiday', variant: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openEdit = (h: any) => {
    setForm({ name: h.name, date: h.date, isRecurring: h.isRecurring });
    setEditingId(h.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ name: '', date: '', isRecurring: true });
    setEditingId(null);
    setShowModal(true);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays & Non-Working Days</h1>
          <p className="page-subtitle">Manage public holidays to ensure accurate absence tracking</p>
        </div>
        {can(userRole, 'holidays.manage') && (
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} style={{ marginRight: 8 }} />
            Add Holiday
          </button>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <Calendar size={20} style={{ marginRight: 8, color: 'var(--primary)' }} />
          <span className="table-title">Public Holidays</span>
        </div>

        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : holidays.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏖️</div>
            <p className="empty-state-text">No holidays defined yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 600 }}>{h.name}</td>
                  <td>{format(parseISO(h.date), 'dd MMMM')} {h.isRecurring ? '' : format(parseISO(h.date), 'yyyy')}</td>
                  <td>
                    <span className={`badge ${h.isRecurring ? 'badge-blue' : 'badge-amber'}`}>
                      {h.isRecurring ? 'Every Year' : 'One-time'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(h)} aria-label="Edit Holiday">
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(h.id)} aria-label="Delete Holiday">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={showModal}
        onOpenChange={(open) => !open && setShowModal(false)}
        title={editingId ? 'Edit Holiday' : 'Add New Holiday'}
        maxWidth={400}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" form="holiday-form" className="btn btn-primary">{editingId ? 'Update' : 'Save Holiday'}</button>
          </>
        }
      >
        <form id="holiday-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="holidayName">Holiday Name</label>
            <input id="holidayName" className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Independence Day" />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="holidayDate">Date</label>
            <input id="holidayDate" type="date" className="form-input" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="holidayRecurring" type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} />
            <label htmlFor="holidayRecurring" style={{ marginBottom: 0 }}>Repeats every year</label>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        variant="danger"
      />

      <AlertDialog
        open={!!alertData}
        onOpenChange={(open) => !open && setAlertData(null)}
        title={alertData?.title ?? ''}
        message={alertData?.msg}
        variant={alertData?.variant}
      />
    </>
  );
}
