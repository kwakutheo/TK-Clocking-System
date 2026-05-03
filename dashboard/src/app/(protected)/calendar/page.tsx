'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { calendarApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Trash2, Edit2, Coffee, ChevronRight, ChevronDown, GraduationCap } from 'lucide-react';

const fetcher = () => calendarApi.listTerms().then((r) => r.data);

export default function AcademicCalendarPage() {
  const { data, isLoading, mutate } = useSWR('academic-calendar', fetcher);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  const [termForm, setTermForm] = useState({
    name: '',
    academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    startDate: '',
    endDate: '',
  });

  const [breakForm, setBreakForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const terms: any[] = data ?? [];

  // Group terms by academic year
  const groupedTerms = terms.reduce((acc: Record<string, any[]>, term) => {
    const year = term.academicYear || 'Unassigned Year';
    if (!acc[year]) acc[year] = [];
    acc[year].push(term);
    return acc;
  }, {});

  // Sort years descending (e.g., "2025/2026" before "2024/2025")
  const sortedYears = Object.keys(groupedTerms).sort((a, b) => b.localeCompare(a));

  const handleTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingTerm) {
        await calendarApi.updateTerm(editingTerm.id, {
          ...termForm,
          isActive: editingTerm.isActive
        });
      } else {
        await calendarApi.createTerm(termForm);
      }
      mutate();
      setShowTermModal(false);
      setEditingTerm(null);
      setTermForm({
        name: '',
        academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        startDate: '',
        endDate: '',
      });
    } catch (err) {
      alert('Failed to save term');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBreakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTermId) return;
    setIsSubmitting(true);
    try {
      await calendarApi.createBreak(selectedTermId, breakForm);
      mutate();
      setShowBreakModal(false);
      setBreakForm({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      alert('Failed to save break');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTerm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this term? All associated breaks will be removed.')) return;
    try {
      await calendarApi.deleteTerm(id);
      mutate();
    } catch (err) {
      alert('Failed to delete term');
    }
  };

  const deleteBreak = async (id: string) => {
    if (!confirm('Delete this break?')) return;
    try {
      await calendarApi.deleteBreak(id);
      mutate();
    } catch (err) {
      alert('Failed to delete break');
    }
  };

  const openEditTerm = (term: any) => {
    setEditingTerm(term);
    setTermForm({
      name: term.name,
      academicYear: term.academicYear,
      startDate: term.startDate,
      endDate: term.endDate,
    });
    setShowTermModal(true);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Academic Calendar</h1>
        <p className="page-subtitle">Manage school terms, mid-term breaks, and vacations</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => { setEditingTerm(null); setShowTermModal(true); }}>
          <Plus size={18} /> Add New Term
        </button>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : terms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Calendar size={48} /></div>
          <p className="empty-state-text">No academic terms defined yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sortedYears.map((year, index) => {
            // Sort terms within the year by start date ascending (e.g. Term 1 -> Term 2 -> Term 3)
            const yearTerms = groupedTerms[year].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            
            // First year is expanded by default if not set in state
            const isExpanded = expandedYears[year] !== undefined ? expandedYears[year] : index === 0;
            
            return (
              <div key={year} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !isExpanded }))}
                  style={{ 
                    padding: '16px 20px', 
                    background: 'rgba(255,255,255,0.02)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Calendar size={20} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                      Academic Year: <span style={{ color: 'var(--primary)' }}>{year}</span>
                    </h2>
                    <span className="badge badge-gray" style={{ marginLeft: 8 }}>{yearTerms.length} terms</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: 20, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
                      {yearTerms.map((term) => (
                        <div key={term.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <GraduationCap size={20} style={{ color: 'var(--primary)' }} />
                                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{term.name}</h3>
                              </div>
                              {term.isActive && <span className="badge badge-green" style={{ marginTop: 4 }}>Current Term</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => openEditTerm(term)} style={{ color: 'var(--text-secondary)' }}><Edit2 size={16} /></button>
                              <button onClick={() => deleteTerm(term.id)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Starts:</span>
                              <span style={{ fontWeight: 600 }}>{format(parseISO(term.startDate), 'PPP')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Ends:</span>
                              <span style={{ fontWeight: 600 }}>{format(parseISO(term.endDate), 'PPP')}</span>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5 }}>
                                Mid-term Breaks
                              </h4>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                onClick={() => { setSelectedTermId(term.id); setShowBreakModal(true); }}
                                style={{ padding: '4px 8px', fontSize: 11 }}
                              >
                                <Plus size={14} /> Add Break
                              </button>
                            </div>

                            {term.breaks?.length === 0 ? (
                              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                                No breaks scheduled for this term.
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {term.breaks.map((b: any) => (
                                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <Coffee size={14} style={{ color: 'var(--accent)' }} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        {format(parseISO(b.startDate), 'dd MMM')} — {format(parseISO(b.endDate), 'dd MMM')}
                                      </div>
                                    </div>
                                    <button onClick={() => deleteBreak(b.id)} style={{ color: 'var(--danger)', opacity: 0.6 }}><Trash2 size={14} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Term Modal */}
      {showTermModal && (
        <div className="modal-overlay" onClick={() => setShowTermModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTerm ? 'Edit Term' : 'Add New Term'}</h3>
              <button className="modal-close" onClick={() => setShowTermModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleTermSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Term Name</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. Term 1" 
                    value={termForm.name}
                    onChange={e => setTermForm({...termForm, name: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group full-width">
                  <label>Academic Year</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. 2023/2024" 
                    value={termForm.academicYear}
                    onChange={e => setTermForm({...termForm, academicYear: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={termForm.startDate}
                    onChange={e => setTermForm({...termForm, startDate: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={termForm.endDate}
                    onChange={e => setTermForm({...termForm, endDate: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTermModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Break Modal */}
      {showBreakModal && (
        <div className="modal-overlay" onClick={() => setShowBreakModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Add Mid-term Break</h3>
              <button className="modal-close" onClick={() => setShowBreakModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleBreakSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-group">
                  <label>Break Name</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. Mid-term break" 
                    value={breakForm.name}
                    onChange={e => setBreakForm({...breakForm, name: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={breakForm.startDate}
                    onChange={e => setBreakForm({...breakForm, startDate: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={breakForm.endDate}
                    onChange={e => setBreakForm({...breakForm, endDate: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBreakModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Add Break'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
