'use client';
import useSWR from 'swr';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { employeesApi, branchesApi, departmentsApi, shiftsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { can } from '@/lib/permissions';

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
  const [deleteInputName, setDeleteInputName] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState<string | null>(null);
  const [adminPasswordValue, setAdminPasswordValue] = useState('');

  const [activeBranch, setActiveBranch] = useState<string>('all');
  const [activeStatusView, setActiveStatusView] = useState<'all' | 'active' | 'inactive' | 'suspended'>('active');
  const [activeRoleView, setActiveRoleView] = useState<'all' | 'staff' | 'admin'>('all');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Action menu state is managed below with a fixed overlay

  const toggleDept = (deptName: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptName]: prev[deptName] === undefined ? false : !prev[deptName]
    }));
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    departmentId: '',
    branchId: '',
    shiftId: '',
    position: '',
    phone: '',
    hireDate: '',
    role: 'employee',
    status: 'active',
  });

  const employees: any[] = data ?? [];
  const branches: any[] = branchesData ?? [];
  const departments: any[] = departmentsData ?? [];
  const shifts: any[] = shiftsData ?? [];

  const contextFiltered = useMemo(() => employees.filter((e) => {
    const role = e.user?.role ?? 'employee';
    if (activeRoleView === 'staff' && (role === 'hr_admin' || role === 'super_admin')) return false;
    if (activeRoleView === 'admin' && (role === 'employee' || role === 'supervisor')) return false;

    const name = e.user?.fullName?.toLowerCase() ?? '';
    const code = e.employeeCode?.toLowerCase() ?? '';
    const uname = e.user?.username?.toLowerCase() ?? '';
    const dept = e.department?.name?.toLowerCase() ?? '';
    const q = search.toLowerCase();
    
    const matchesSearch = !q || name.includes(q) || code.includes(q) || uname.includes(q) || dept.includes(q);
    const matchesBranch = activeBranch === 'all' || e.branch?.id === activeBranch;
    
    return matchesSearch && matchesBranch;
  }), [employees, activeRoleView, search, activeBranch]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0, active: 0, inactive: 0, suspended: 0 };
    contextFiltered.forEach(emp => {
      counts.all++;
      if (emp.status === 'active') counts.active++;
      else if (emp.status === 'inactive') counts.inactive++;
      else if (emp.status === 'suspended') counts.suspended++;
    });
    return counts;
  }, [contextFiltered]);

  const filtered = useMemo(() => {
    const statusFiltered = activeStatusView === 'all' 
      ? contextFiltered 
      : contextFiltered.filter(e => e.status === activeStatusView);
      
    return [...statusFiltered].sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 1, suspended: 2, inactive: 3 };
      const aStatus = statusOrder[a.status] || 4;
      const bStatus = statusOrder[b.status] || 4;
      if (aStatus !== bStatus) return aStatus - bStatus;
      
      const aName = a.user?.fullName ?? '';
      const bName = b.user?.fullName ?? '';
      return aName.localeCompare(bName);
    });
  }, [contextFiltered, activeStatusView]);

  const groupedEmployees = filtered.reduce((acc: Record<string, any[]>, emp) => {
    const deptName = emp.department?.name || 'Unassigned Department';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(emp);
    return acc;
  }, {});

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
      phone: '',
      hireDate: format(new Date(), 'yyyy-MM-dd'), // default to today
      role: 'employee',
      status: 'active',
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
      phone: emp.user?.phone ?? '',
      hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : '',
      role: emp.user?.role ?? 'employee',
      status: emp.status ?? 'active',
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
          phone: form.phone || undefined,
          hireDate: form.hireDate || undefined,
          role: form.role,
          status: form.status,
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
          phone: form.phone || undefined,
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

  const handleStatusToggle = async (id: string, newStatus: string) => {
    try {
      await employeesApi.update(id, { status: newStatus });
      await mutate();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to update status.');
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

  const userRole = useMemo(() =>
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') ?? '{}')?.role as string
      : ''
  , []);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your workforce — {filtered.length} matching</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: 4, borderRadius: 8, gap: 4, border: '1px solid var(--border)' }}>
          <button 
            className={`btn btn-sm ${activeRoleView === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveRoleView('all')}
            style={{ border: 'none', boxShadow: activeRoleView === 'all' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none' }}
          >
            All Staff
          </button>
          <button 
            className={`btn btn-sm ${activeRoleView === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveRoleView('staff')}
            style={{ border: 'none', boxShadow: activeRoleView === 'staff' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none' }}
          >
            Regular Employees
          </button>
          <button 
            className={`btn btn-sm ${activeRoleView === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveRoleView('admin')}
            style={{ border: 'none', boxShadow: activeRoleView === 'admin' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none' }}
          >
            HR & Admins
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <button 
            className={`btn btn-sm ${activeStatusView === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveStatusView('all')}
            style={{ borderRadius: 20, whiteSpace: 'nowrap' }}
          >
            All ({statusCounts.all})
          </button>
          <button 
            className={`btn btn-sm ${activeStatusView === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveStatusView('active')}
            style={{ borderRadius: 20, whiteSpace: 'nowrap' }}
          >
            Active ({statusCounts.active})
          </button>
          <button 
            className={`btn btn-sm ${activeStatusView === 'suspended' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveStatusView('suspended')}
            style={{ borderRadius: 20, whiteSpace: 'nowrap' }}
          >
            Suspended ({statusCounts.suspended})
          </button>
          <button 
            className={`btn btn-sm ${activeStatusView === 'inactive' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveStatusView('inactive')}
            style={{ borderRadius: 20, whiteSpace: 'nowrap' }}
          >
            Inactive ({statusCounts.inactive})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
          <button 
            className={`btn btn-sm ${activeBranch === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveBranch('all')}
            style={{ borderRadius: 20, whiteSpace: 'nowrap' }}
          >
            All Branches
          </button>
          {branches.map((b: any) => (
            <button 
              key={b.id}
              className={`btn btn-sm ${activeBranch === b.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveBranch(b.id)}
              style={{ borderRadius: 20, whiteSpace: 'nowrap' }}
            >
              {b.name}
            </button>
          ))}
        </div>

        <div className="table-header">
          <span className="table-title">Employees List</span>
          <div className="table-controls">
            <input
              className="form-input"
              placeholder="Search by name, code or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            {can(userRole, 'employees.create') && (
              <button className="btn btn-primary" onClick={openCreate}>
                + Register Employee
              </button>
            )}
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
              {Object.keys(groupedEmployees).sort().map(deptName => {
                const isExpanded = expandedDepts[deptName] !== false; // true by default
                const deptEmployees = groupedEmployees[deptName];
                
                return (
                  <tbody key={deptName}>
                    {/* Department Header Row */}
                    <tr 
                      onClick={() => toggleDept(deptName)}
                      style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--border)', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                    >
                      <td colSpan={10} style={{ padding: '12px 16px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 10, 
                            opacity: 0.5,
                            display: 'inline-block',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}>▶</span>
                          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{deptName}</span>
                          <span className="badge badge-gray" style={{ fontSize: 11 }}>{deptEmployees.length}</span>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Employee Rows */}
                    {isExpanded && deptEmployees.map((emp: any, index: number) => {
                      const isInactive = emp.status === 'inactive' || emp.status === 'suspended';
                      return (
                      <tr 
                        key={emp.id} 
                        className="emp-row-animate"
                        style={{ 
                          background: 'transparent', 
                          opacity: isInactive ? 0.6 : 1, 
                          transition: 'opacity 0.2s',
                          animationDelay: `${index * 0.02}s`
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar">
                              {(emp.user?.fullName ?? '').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{emp.user?.fullName}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {emp.user?.email} {emp.user?.email && emp.user?.phone ? '•' : ''} {emp.user?.phone}
                              </div>
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
                        <td>
                          {can(userRole, 'employees.toggle_status') ? (
                            <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', cursor: 'default', gap: 8 }}>
                              <div style={{
                                width: 36,
                                height: 20,
                                background: emp.status === 'active' ? 'var(--success)' : 'var(--border)',
                                borderRadius: 10,
                                position: 'relative',
                                opacity: 0.9,
                              }}>
                                <div style={{
                                  width: 16,
                                  height: 16,
                                  background: 'white',
                                  borderRadius: '50%',
                                  position: 'absolute',
                                  top: 2,
                                  left: emp.status === 'active' ? 18 : 2,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                              <span style={{ fontSize: 12, color: emp.status === 'active' ? 'var(--success)' : 'var(--text-secondary)' }}>
                                {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                              </span>
                            </div>
                          ) : (
                            <span className={`badge ${statusBadge[emp.status] ?? 'badge-blue'}`}>{emp.status}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {emp.hireDate ? format(new Date(emp.hireDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td style={{ position: 'relative', zIndex: openActionMenu === emp.id ? 50 : 1 }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ padding: 0, fontSize: 18, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid transparent' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenu(openActionMenu === emp.id ? null : emp.id);
                            }}
                            title="More Actions"
                          >
                            ⋮
                          </button>

                          {openActionMenu === emp.id && (
                            <>
                              <div 
                                style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                                onClick={(e) => { e.stopPropagation(); setOpenActionMenu(null); }}
                              />
                              <div 
                                style={{ 
                                  position: 'absolute', 
                                  right: 32, 
                                  top: 0, 
                                  background: 'var(--bg-surface)', 
                                  border: '1px solid var(--border)', 
                                  borderRadius: 8, 
                                  padding: 6, 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: 2, 
                                  zIndex: 100, 
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                  minWidth: 170
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {can(userRole, 'employees.edit') && (
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ justifyContent: 'flex-start', width: '100%', padding: '8px 12px', fontSize: 13, border: 'none', background: 'transparent' }}
                                  onClick={(e) => { e.stopPropagation(); setOpenActionMenu(null); openEdit(emp); }}
                                >
                                  <span style={{ marginRight: 10 }}>✏️</span> Edit Profile
                                </button>
                              )}
                              {can(userRole, 'employees.reset_password') && (
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ justifyContent: 'flex-start', width: '100%', padding: '8px 12px', fontSize: 13, color: 'var(--amber-600)', border: 'none', background: 'transparent' }}
                                  onClick={(e) => { e.stopPropagation(); setOpenActionMenu(null); setResetPasswordConfirm(emp.id); setAdminPasswordValue(''); }}
                                >
                                  <span style={{ marginRight: 10 }}>🔑</span> Reset Password
                                </button>
                              )}
                              {can(userRole, 'employees.delete') && (
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ justifyContent: 'flex-start', width: '100%', padding: '8px 12px', fontSize: 13, color: 'var(--danger)', border: 'none', background: 'transparent' }}
                                  onClick={(e) => { e.stopPropagation(); setOpenActionMenu(null); setDeleteConfirm(emp.id); setDeleteInputName(''); }}
                                >
                                  <span style={{ marginRight: 10 }}>🗑️</span> Delete Employee
                                </button>
                              )}
                            </div>
                            </>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                );
              })}
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
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close Modal">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    id="firstName"
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    id="lastName"
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
                {!editingId && (
                  <>
                    <div className="form-group">
                      <label htmlFor="username">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="username"
                        className="form-input"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="password">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="password"
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
                  <label htmlFor="departmentId">Department</label>
                  <select
                    id="departmentId"
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
                  <label htmlFor="branchId">Branch <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="branchId"
                    className="form-input"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                  >
                    <option value="">— Select —</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="shiftId">Assigned Shift <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="shiftId"
                    className="form-input"
                    value={form.shiftId}
                    onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
                    required
                  >
                    <option value="">— Select Shift —</option>
                    {shifts.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="position">Position</label>
                  <input
                    id="position"
                    className="form-input"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hireDate">Date Hired</label>
                  <input
                    id="hireDate"
                    className="form-input"
                    type="date"
                    value={form.hireDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+233..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
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
                {editingId && can(userRole, 'employees.toggle_status') && (
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      className="form-input"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}
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
      {deleteConfirm && (() => {
        const empToDelete = employees.find(e => e.id === deleteConfirm);
        if (!empToDelete) return null;
        
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal-content" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Employee</h3>
                <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
              </div>
              <div style={{ padding: '0 4px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Are you sure you want to delete <strong>{empToDelete.user?.fullName}</strong>? This action cannot be undone and will permanently remove all their historical data.
                </p>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label>Please type <strong>{empToDelete.user?.fullName}</strong> to confirm.</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deleteInputName}
                    onChange={(e) => setDeleteInputName(e.target.value)}
                    placeholder={empToDelete.user?.fullName}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteInputName !== empToDelete.user?.fullName}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
