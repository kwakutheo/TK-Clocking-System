'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { holidaysApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Trash2, Edit, ShieldAlert } from 'lucide-react';
import { can } from '@/lib/permissions';
import { useAuthStore } from '@/lib/store';
import { useMemo } from 'react';

const fetcher = () => holidaysApi.list().then((r) => r.data);

export default function HolidaysPage() {
  const { data, isLoading, mutate } = useSWR('holidays-list', fetcher);
  const { user } = useAuthStore();
  const holidays: any[] = data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: true });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const currentYearStr = new Date().getFullYear().toString();

  const { recurring, groupedByYear, sortedYears } = useMemo(() => {
    const recurring: any[] = [];
    const byYear: Record<string, any[]> = {};

    holidays.forEach(h => {
      if (h.isRecurring) {
        recurring.push(h);
      } else {
        const year = format(parseISO(h.date), 'yyyy');
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(h);
      }
    });

    // Sort years descending so newest is on top
    const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
    return { recurring, groupedByYear: byYear, sortedYears };
  }, [holidays]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: prev[groupName] === undefined ? false : !prev[groupName] }));
  };

  const isGroupExpanded = (groupName: string, isPastYear: boolean = false) => {
    if (expandedGroups[groupName] !== undefined) return expandedGroups[groupName];
    return !isPastYear; // Past years collapsed by default, others expanded
  };

  const renderHolidayRow = (h: any, index: number) => (
    <tr 
      key={h.id}
      className="emp-row-animate"
      style={{ 
        background: 'transparent', 
        animationDelay: `${index * 0.05}s`
      }}
    >
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
          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(h.id)} aria-label="Delete Holiday">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

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
      alert(editingId ? 'Failed to update holiday' : 'Failed to add holiday');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await holidaysApi.delete(id);
      mutate();
    } catch (err) {
      alert('Failed to delete');
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
            {recurring.length > 0 && (
              <tbody key="recurring">
                <tr 
                  onClick={() => toggleGroup('recurring')}
                  style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--border)', borderBottom: isGroupExpanded('recurring') ? '1px solid var(--border)' : 'none' }}
                >
                  <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontSize: 10, 
                        opacity: 0.5,
                        display: 'inline-block',
                        transform: isGroupExpanded('recurring') ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }}>▶</span>
                      <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Permanent Holidays (Every Year)</span>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>{recurring.length}</span>
                    </div>
                  </td>
                </tr>
                {isGroupExpanded('recurring') && recurring.map((h, index) => renderHolidayRow(h, index))}
              </tbody>
            )}

            {sortedYears.map(year => {
              const isPastYear = year < currentYearStr;
              const expanded = isGroupExpanded(year, isPastYear);
              const yearHolidays = groupedByYear[year];

              return (
                <tbody key={year}>
                  <tr 
                    onClick={() => toggleGroup(year)}
                    style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--border)', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
                  >
                    <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ 
                          fontSize: 10, 
                          opacity: 0.5,
                          display: 'inline-block',
                          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}>▶</span>
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{year} One-Time Holidays {isPastYear && <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>(Archived)</span>}</span>
                        <span className="badge badge-gray" style={{ fontSize: 11 }}>{yearHolidays.length}</span>
                      </div>
                    </td>
                  </tr>
                  {expanded && yearHolidays.map((h, index) => renderHolidayRow(h, index))}
                </tbody>
              );
            })}
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close Modal">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="holidayName">Holiday Name</label>
                <input id="holidayName" className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Independence Day" />
              </div>
              <div className="form-group">
                <label htmlFor="holidayDate">Date</label>
                <input id="holidayDate" type="date" className="form-input" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input id="holidayRecurring" type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} />
                <label htmlFor="holidayRecurring" style={{ marginBottom: 0 }}>Repeats every year</label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Save Holiday'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
