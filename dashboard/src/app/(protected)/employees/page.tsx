'use client';
import useSWR from 'swr';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { employeesApi, branchesApi, departmentsApi, shiftsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const fetcher = () => employeesApi.list().then((r) => r.data);
const branchesFetcher = () => branchesApi.list().then((r) => r.data);
const departmentsFetcher = () => departmentsApi.list().then((r) => r.data);
const shiftsFetcher = () => shiftsApi.list().then((r) => r.data);

const roleBadge: Record<string, string> = {
  employee: 'badge-blue',
  supervisor: 'badge-amber',
  hr_admin: 'badge-orange',
  super_admin: 'badge-red',
};

const roleLabel: Record<string, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  hr_admin: 'HR Admin',
  super_admin: 'Super Admin',
};

const statusBadge: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-red',
  suspended: 'badge-amber',
};

export default function EmployeesPage() {
  const { user, setAuth } = useAuthStore();
  const { data, isLoading, mutate } = useSWR('employees-full', fetcher);
  const { data: branchesData } = useSWR('branches-list', branchesFetcher);
  const { data: departmentsData } = useSWR('departments-list', departmentsFetcher);
  const { data: shiftsData } = useSWR('shifts-list', shiftsFetcher);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState<string | null>(null);
  const [adminPasswordValue, setAdminPasswordValue] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    departmentId: '',
    branchId: '',
    shiftId: '',
    position: '',
    hireDate: '',
    role: 'employee',
  });

  const employees: any[] = data ?? [];
  const branches: any[] = branchesData ?? [];
  const departments: any[] = departmentsData ?? [];
  const shifts: any[] = shiftsData ?? [];

  const filtered = employees.filter((e) => {
    const name = e.user?.fullName?.toLowerCase() ?? '';
    const code = e.employeeCode?.toLowerCase() ?? '';
    const uname = e.user?.username?.toLowerCase() ?? '';
    const dept = e.department?.name?.toLowerCase() ?? '';
    const q = search.toLowerCase();
    return !q || name.includes(q) || code.includes(q) || uname.includes(q) || dept.includes(q);
  });

  const resetForm = useCallback(() => {
    setForm({
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      departmentId: '',
      branchId: '',
      shiftId: '',
      position: '',
      hireDate: '',
      role: 'employee',
    });
    setEditingId(null);
    setError('');
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const openEdit = useCallback((emp: any) => {
    const nameParts = (emp.user?.fullName ?? '').split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') ?? '';
    setForm({
      firstName,
      lastName,
      username: emp.user?.username ?? '',
      password: '',
      departmentId: emp.department?.id ?? '',
      branchId: emp.branch?.id ?? '',
      shiftId: emp.shift?.id ?? '',
      position: emp.position ?? '',
      hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : '',
      role: emp.user?.role ?? 'employee',
    });
    setEditingId(emp.id);
    setShowModal(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const fullName = `${form.firstName} ${form.lastName}`.trim();

    try {
      if (editingId) {
        const res = await employeesApi.update(editingId, {
          fullName,
          departmentId: form.departmentId || undefined,
          branchId: form.branchId || undefined,
          shiftId: form.shiftId || undefined,
          position: form.position || undefined,
          hireDate: form.hireDate || undefined,
          role: form.role,
        });

        if (user && res.data.user?.id === user.id) {
          const token = localStorage.getItem('access_token') || '';
          setAuth(res.data.user, token);
        }
      } else {
        await employeesApi.register({
          fullName,
          username: form.username,
          password: form.password,
          departmentId: form.departmentId || undefined,
          branchId: form.branchId || undefined,
          shiftId: form.shiftId || undefined,
          position: form.position || undefined,
          hireDate: form.hireDate || undefined,
          role: form.role,
        });
      }
      await mutate();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordConfirm || !adminPasswordValue) return;
    setIsSubmitting(true);
    try {
      const response = await employeesApi.resetPassword(resetPasswordConfirm, adminPasswordValue);
      alert(`Account Unlocked!\n\nPlease give this temporary PIN to the employee: ${response.data.pin}\n\nThey must enter this PIN in the mobile app to create a new password.`);
      setResetPasswordConfirm(null);
      setAdminPasswordValue('');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await employeesApi.delete(id);
      await mutate();
      setDeleteConfirm(null);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to delete employee.');
    }
  };

  const userRole = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') ?? '{}')?.role
    : '';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Employees</h1>
        <p className="page-subtitle">Manage your workforce — {employees.length} total</p>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">All Employees</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="form-input"
              placeholder="Search by name, code or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <button className="btn btn-primary" onClick={openCreate}>
              + Register Employee
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p className="empty-state-text">{search ? 'No employees match your search.' : 'No employees found.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Username</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Branch</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Hired</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp: any) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">
                          {(emp.user?.fullName ?? '').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp.user?.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.user?.email ?? emp.user?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {emp.user?.username ?? '—'}
                    </td>
                    <td style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{emp.employeeCode}</td>
                    <td style={{ fontSize: 13 }}>{emp.department?.name ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{emp.branch?.name ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emp.position ?? '—'}</td>
                    <td><span className={`badge ${roleBadge[emp.user?.role] ?? 'badge-blue'}`}>{roleLabel[emp.user?.role] ?? emp.user?.role}</span></td>
                    <td><span className={`badge ${statusBadge[emp.status] ?? 'badge-blue'}`}>{emp.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {emp.hireDate ? format(new Date(emp.hireDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => openEdit(emp)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {(userRole === 'super_admin' || userRole === 'hr_admin') && (
                          <button
                            className="btn btn-sm"
                            style={{ padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--amber-100)', color: 'var(--amber-800)', borderColor: 'var(--amber-200)' }}
                            onClick={() => { setResetPasswordConfirm(emp.id); setAdminPasswordValue(''); }}
                            title="Reset Password"
                          >
                            🔑
                          </button>
                        )}
                        {userRole === 'super_admin' && (
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={() => setDeleteConfirm(emp.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Employee' : 'Register New Employee'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
                {!editingId && (
                  <>
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        className="form-input"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        className="form-input"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Department</label>
                  <select
                    className="form-input"
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select
                    className="form-input"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assigned Shift</label>
                  <select
                    className="form-input"
                    value={form.shiftId}
                    onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
                  >
                    <option value="">— Select Shift —</option>
                    {shifts.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    className="form-input"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date Hired</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.hireDate}
                    onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    className="form-input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="hr_admin">HR Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Employee</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p>Are you sure you want to delete this employee? This action cannot be undone.</p>
            <div className="modal-footer">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordConfirm && (
        <div className="modal-overlay" onClick={() => setResetPasswordConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="modal-close" onClick={() => setResetPasswordConfirm(null)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Confirm with your Admin Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={adminPasswordValue}
                  onChange={(e) => setAdminPasswordValue(e.target.value)}
                  placeholder="Your admin password"
                  required
                />
              </div>
              <div className="modal-footer" style={{ marginTop: 24 }}>
                <button type="button" className="btn" onClick={() => { setResetPasswordConfirm(null); setAdminPasswordValue(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !adminPasswordValue}>
                  {isSubmitting ? 'Requesting…' : 'Generate PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
