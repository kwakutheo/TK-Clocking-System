'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { holidaysApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Trash2, Edit } from 'lucide-react';

const fetcher = () => holidaysApi.list().then((r) => r.data);

export default function HolidaysPage() {
  const { data, isLoading, mutate } = useSWR('holidays-list', fetcher);
  const holidays: any[] = data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: true });

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
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} style={{ marginRight: 8 }} />
          Add Holiday
        </button>
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
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(h.id)} aria-label="Delete Holiday">
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
