'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { departmentsApi } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';

const fetcher = () => departmentsApi.list().then((r) => r.data);

export default function DepartmentsPage() {
  const { data, isLoading, mutate } = useSWR('departments', fetcher);
  const departments: any[] = data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [alertData, setAlertData] = useState<{ title: string; msg: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const [name, setName] = useState('');
  const userRole = useMemo(() =>
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') ?? '{}')?.role as string
      : ''
  , []);

  const resetForm = () => {
    setName('');
    setEditingId(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (dept: any) => {
    setName(dept.name ?? '');
    setEditingId(dept.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await departmentsApi.update(editingId, { name });
      } else {
        await departmentsApi.create({ name });
      }
      await mutate();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setAlertData({
        title: 'Error',
        msg: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong.',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await departmentsApi.delete(id);
      await mutate();
      setDeleteConfirm(null);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setAlertData({ title: 'Error', msg: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to delete department.', variant: 'error' });
    }
  };

  if (!can(userRole, 'departments.manage')) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--danger)' }}>🚫</div>
        <p className="empty-state-text">Access Denied. You do not have permission to manage departments.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage company departments</p>
        </div>
        {can(userRole, 'departments.manage') && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Department</button>
        )}
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {departments.map((dept: any) => (
            <div key={dept.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{dept.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    ID: {dept.id.slice(0, 8)}…
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>✏️ Edit</button>
                  {can(userRole, 'departments.manage') && (
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(dept.id)}>🗑️ Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {departments.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">🏢</div>
              <p className="empty-state-text">No departments configured yet.</p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={showModal}
        onOpenChange={(open) => !open && setShowModal(false)}
        title={editingId ? 'Edit Department' : 'Add Department'}
        maxWidth={400}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" form="dept-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Department'}
            </button>
          </>
        }
      >
        <form id="dept-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="deptName">Department Name</label>
            <input
              id="deptName"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              required
            />
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Department"
        message="Are you sure you want to delete this department? Employees assigned to it will be unassigned."
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
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
