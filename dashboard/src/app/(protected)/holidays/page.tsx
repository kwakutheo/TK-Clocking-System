'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { holidaysApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Trash2 } from 'lucide-react';

const fetcher = () => holidaysApi.list().then((r) => r.data);

export default function HolidaysPage() {
  const { data, isLoading, mutate } = useSWR('holidays-list', fetcher);
  const holidays: any[] = data ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: true });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await holidaysApi.create(form);
      mutate();
      setShowAdd(false);
      setForm({ name: '', date: '', isRecurring: true });
    } catch (err) {
      alert('Failed to add holiday');
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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Holidays & Non-Working Days</h1>
        <p className="page-subtitle">Manage public holidays to ensure accurate absence tracking</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
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
                    <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(h.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Holiday</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Holiday Name</label>
                <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Independence Day" />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-input" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} />
                <label style={{ marginBottom: 0 }}>Repeats every year</label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
