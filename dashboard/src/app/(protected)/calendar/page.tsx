'use client';
import useSWR from 'swr';
import { useState, useMemo, useEffect } from 'react';
import { calendarApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Trash2, Edit2, Coffee, ChevronRight, ChevronDown, GraduationCap, ShieldAlert } from 'lucide-react';
import { can } from '@/lib/permissions';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';

const fetcher = () => calendarApi.listTerms().then((r) => r.data);

export default function AcademicCalendarPage() {
  const { data, isLoading, mutate } = useSWR('academic-calendar', fetcher);

  const userRole = useMemo(() =>
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') ?? '{}')?.role as string
      : ''
  , []);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [hasInitialized, setHasInitialized] = useState(false);
  const [alertData, setAlertData] = useState<{ title: string; msg: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [deleteTermConfirm, setDeleteTermConfirm] = useState<string | null>(null);
  const [deleteBreakConfirm, setDeleteBreakConfirm] = useState<string | null>(null);

  const [termForm, setTermForm] = useState({
    name: '',
    academicYear: '',
    startDate: '',
    endDate: '',
  });

  const [yearForm, setYearForm] = useState({
    academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    terms: [
      { name: 'First Term', startDate: '', endDate: '' },
      { name: 'Second Term', startDate: '', endDate: '' },
      { name: 'Third Term', startDate: '', endDate: '' }
    ]
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

  const currentAcademicYear = useMemo(() => {
    if (!terms.length) return null;
    const now = new Date();
    let currentYear = null;

    // 1. Try to find the year that contains the current date
    for (const term of terms) {
      if (!term.startDate || !term.endDate) continue;
      const start = parseISO(term.startDate);
      const end = parseISO(term.endDate);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) {
        currentYear = term.academicYear;
        break;
      }
    }

    // 2. Fallback to the active term
    if (!currentYear) {
      const activeTerm = terms.find((t: any) => t.isActive);
      currentYear = activeTerm?.academicYear;
    }

    // 3. Fallback to the newest year
    if (!currentYear && sortedYears.length > 0) {
      currentYear = sortedYears[0];
    }
    
    return currentYear;
  }, [terms, sortedYears]);

  useEffect(() => {
    if (hasInitialized || !currentAcademicYear) return;
    setExpandedYears({ [currentAcademicYear]: true });
    setHasInitialized(true);
  }, [currentAcademicYear, hasInitialized]);

  const handleYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validTerms = yearForm.terms.filter(t => t.name && t.startDate && t.endDate);
    
    // Validate terms internally
    for (let i = 0; i < validTerms.length; i++) {
      const currentStart = new Date(validTerms[i].startDate).getTime();
      const currentEnd = new Date(validTerms[i].endDate).getTime();
      
      if (currentStart > currentEnd) {
        setAlertData({ title: 'Validation Error', msg: `${validTerms[i].name} cannot end before its start date.`, variant: 'error' });
        setIsSubmitting(false);
        return;
      }
      
      for (let j = i + 1; j < validTerms.length; j++) {
        const nextStart = new Date(validTerms[j].startDate).getTime();
        const nextEnd = new Date(validTerms[j].endDate).getTime();
        if (Math.max(currentStart, nextStart) <= Math.min(currentEnd, nextEnd)) {
           setAlertData({ title: 'Validation Error', msg: `Dates for ${validTerms[i].name} and ${validTerms[j].name} overlap.`, variant: 'error' });
           setIsSubmitting(false);
           return;
        }
      }

      // Check against existing terms
      for (const existingTerm of terms) {
        const extStart = new Date(existingTerm.startDate).getTime();
        const extEnd = new Date(existingTerm.endDate).getTime();
        if (Math.max(currentStart, extStart) <= Math.min(currentEnd, extEnd)) {
          setAlertData({ title: 'Validation Error', msg: `${validTerms[i].name} overlaps with an another term (${existingTerm.name}).`, variant: 'error' });
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      await Promise.all(
        yearForm.terms.map(t => {
          if (t.name && t.startDate && t.endDate) {
            return calendarApi.createTerm({
              name: t.name,
              startDate: t.startDate,
              endDate: t.endDate,
              academicYear: yearForm.academicYear
            });
          }
          return Promise.resolve();
        })
      );
      mutate();
      setShowYearModal(false);
      setYearForm({
        academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        terms: [
          { name: 'First Term', startDate: '', endDate: '' },
          { name: 'Second Term', startDate: '', endDate: '' },
          { name: 'Third Term', startDate: '', endDate: '' }
        ]
      });
    } catch (err) {
      setAlertData({ title: 'Error', msg: 'Failed to save academic year', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (termForm.startDate && termForm.endDate) {
      const newStart = new Date(termForm.startDate).getTime();
      const newEnd = new Date(termForm.endDate).getTime();
      
      if (newStart > newEnd) {
        setAlertData({ title: 'Validation Error', msg: 'The term cannot end before its start date.', variant: 'error' });
        setIsSubmitting(false);
        return;
      }

      for (const existingTerm of terms) {
        if (editingTerm && existingTerm.id === editingTerm.id) continue;
        const extStart = new Date(existingTerm.startDate).getTime();
        const extEnd = new Date(existingTerm.endDate).getTime();
        if (Math.max(newStart, extStart) <= Math.min(newEnd, extEnd)) {
          setAlertData({ title: 'Validation Error', msg: `This term overlaps with an existing term (${existingTerm.name}).`, variant: 'error' });
          setIsSubmitting(false);
          return;
        }
      }
    }

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
      setTermForm({ name: '', academicYear: '', startDate: '', endDate: '' });
    } catch (err) {
      setAlertData({ title: 'Error', msg: 'Failed to save term', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBreakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTermId) return;
    setIsSubmitting(true);

    const bStart = new Date(breakForm.startDate).getTime();
    const bEnd = new Date(breakForm.endDate).getTime();

    if (bStart > bEnd) {
      setAlertData({ title: 'Validation Error', msg: 'The break cannot end before its start date.', variant: 'error' });
      setIsSubmitting(false);
      return;
    }

    const parentTerm = terms.find(t => t.id === selectedTermId);
    if (parentTerm) {
      const tStart = new Date(parentTerm.startDate).getTime();
      const tEnd = new Date(parentTerm.endDate).getTime();
      
      if (bStart < tStart || bEnd > tEnd) {
        setAlertData({ title: 'Validation Error', msg: 'The mid-term break must fall completely within the start and end dates of the term.', variant: 'error' });
        setIsSubmitting(false);
        return;
      }

      for (const existingBreak of parentTerm.breaks || []) {
        const eBStart = new Date(existingBreak.startDate).getTime();
        const eBEnd = new Date(existingBreak.endDate).getTime();
        if (Math.max(bStart, eBStart) <= Math.min(bEnd, eBEnd)) {
          setAlertData({ title: 'Validation Error', msg: `This break overlaps with an existing break (${existingBreak.name}).`, variant: 'error' });
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      await calendarApi.createBreak(selectedTermId, breakForm);
      mutate();
      setShowBreakModal(false);
      setBreakForm({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      setAlertData({ title: 'Error', msg: 'Failed to save break', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteTerm = async () => {
    if (!deleteTermConfirm) return;
    try {
      await calendarApi.deleteTerm(deleteTermConfirm);
      mutate();
    } catch (err) {
      setAlertData({ title: 'Error', msg: 'Failed to delete term', variant: 'error' });
    } finally {
      setDeleteTermConfirm(null);
    }
  };

  const executeDeleteBreak = async () => {
    if (!deleteBreakConfirm) return;
    try {
      await calendarApi.deleteBreak(deleteBreakConfirm);
      mutate();
    } catch (err) {
      setAlertData({ title: 'Error', msg: 'Failed to delete break', variant: 'error' });
    } finally {
      setDeleteBreakConfirm(null);
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

  const openAddTerm = (year: string) => {
    setEditingTerm(null);
    setTermForm({
      name: '',
      academicYear: year,
      startDate: '',
      endDate: '',
    });
    setShowTermModal(true);
  };

  if (!can(userRole, 'calendar.view')) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--danger)' }}><ShieldAlert size={48} /></div>
        <p className="empty-state-text">Access Denied. You do not have permission to view the Academic Calendar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Calendar</h1>
          <p className="page-subtitle">Manage school terms, mid-term breaks, and vacations</p>
        </div>
        {can(userRole, 'calendar.create') && (
          <button className="btn btn-primary" onClick={() => setShowYearModal(true)}>
            <Plus size={18} /> Create Academic Year
          </button>
        )}
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
            
            const isExpanded = expandedYears[year] || false;
            
            return (
              <div key={year} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedYears({ [year]: !isExpanded })}
                  style={{ 
                    padding: '16px 20px', 
                    background: 'rgba(255,255,255,0.02)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Calendar size={20} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                      Academic Year: <span style={{ color: 'var(--primary)' }}>{year}</span>
                    </h2>
                    {year === currentAcademicYear && (
                      <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 11, padding: '3px 8px' }}>Current Year</span>
                    )}
                    <span className="badge badge-gray" style={{ marginLeft: 8 }}>{yearTerms.length} terms</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {yearTerms.length < 3 && can(userRole, 'calendar.create') && (
                      <button 
                        className="btn btn-sm btn-ghost" 
                        onClick={(e) => { e.stopPropagation(); openAddTerm(year); }}
                        style={{ padding: '4px 10px', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Plus size={14} /> Add Missing Term
                      </button>
                    )}
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <ChevronRight 
                        size={20} 
                        style={{ 
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                    </div>
                  </div>
                </div>
                
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateRows: isExpanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ padding: 20, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'start' }}>
                      {yearTerms.map((term) => {
                        const today = new Date();
                        const start = parseISO(term.startDate);
                        const end = parseISO(term.endDate);
                        end.setHours(23, 59, 59, 999);
                        const isCurrentTerm = today >= start && today <= end;

                        return (
                          <div key={term.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <GraduationCap size={18} style={{ color: 'var(--primary)' }} />
                                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{term.name}</h3>
                                </div>
                                {isCurrentTerm && <span className="badge badge-green" style={{ marginTop: 2, fontSize: 10, padding: '2px 6px' }}>Current Term</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                              {can(userRole, 'calendar.edit') && (
                              <button 
                                onClick={() => openEditTerm(term)} 
                                style={{ color: 'var(--text-secondary)' }}
                                aria-label="Edit Term"
                                title="Edit Term"
                              >
                                <Edit2 size={14} />
                              </button>
                              )}
                              {can(userRole, 'calendar.delete') && (
                              <button 
                                onClick={() => setDeleteTermConfirm(term.id)} 
                                style={{ color: 'var(--danger)' }}
                                aria-label="Delete Term"
                                title="Delete Term"
                              >
                                <Trash2 size={14} />
                              </button>
                              )}
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Starts:</span>
                              <span style={{ fontWeight: 600 }}>{format(parseISO(term.startDate), 'MMM do, yyyy')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Ends:</span>
                              <span style={{ fontWeight: 600 }}>{format(parseISO(term.endDate), 'MMM do, yyyy')}</span>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5 }}>
                                Mid-term Breaks
                              </h4>
                              {can(userRole, 'calendar.edit') && (
                              <button 
                                className="btn btn-sm btn-ghost" 
                                onClick={() => { setSelectedTermId(term.id); setShowBreakModal(true); }}
                                style={{ padding: '2px 6px', fontSize: 10, height: 24 }}
                              >
                                <Plus size={12} /> Add Break
                              </button>
                              )}
                            </div>

                            {term.breaks?.length === 0 ? (
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0', margin: 0 }}>
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
                                    {can(userRole, 'calendar.delete') && (
                                    <button 
                                      onClick={() => setDeleteBreakConfirm(b.id)} 
                                      style={{ color: 'var(--danger)', opacity: 0.6 }}
                                      aria-label="Delete Break"
                                      title="Delete Break"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Year Modal */}
      <Dialog
        open={showYearModal}
        onOpenChange={(open) => !open && setShowYearModal(false)}
        title="Create Academic Year"
        maxWidth={600}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowYearModal(false)}>Cancel</button>
            <button type="submit" form="year-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Academic Year'}
            </button>
          </>
        }
      >
        <form id="year-form" onSubmit={handleYearSubmit}>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label htmlFor="yearName">Academic Year</label>
            <input 
              id="yearName"
              className="form-input" 
              placeholder="e.g. 2025/2026" 
              value={yearForm.academicYear}
              onChange={e => setYearForm({...yearForm, academicYear: e.target.value})}
              required 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>
            {yearForm.terms.map((term, index) => (
              <div key={index} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor={`termName-${index}`}>Term Name</label>
                  <input 
                    id={`termName-${index}`}
                    className="form-input" 
                    value={term.name}
                    onChange={e => {
                      const newTerms = [...yearForm.terms];
                      newTerms[index].name = e.target.value;
                      setYearForm({...yearForm, terms: newTerms});
                    }}
                    required={index === 0}
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor={`startDate-${index}`}>Start Date</label>
                    <input 
                      id={`startDate-${index}`}
                      type="date" 
                      className="form-input" 
                      value={term.startDate}
                      onChange={e => {
                        const newTerms = [...yearForm.terms];
                        newTerms[index].startDate = e.target.value;
                        setYearForm({...yearForm, terms: newTerms});
                      }}
                      required={index === 0 || term.endDate !== ''}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`endDate-${index}`}>End Date</label>
                    <input 
                      id={`endDate-${index}`}
                      type="date" 
                      className="form-input" 
                      value={term.endDate}
                      onChange={e => {
                        const newTerms = [...yearForm.terms];
                        newTerms[index].endDate = e.target.value;
                        setYearForm({...yearForm, terms: newTerms});
                      }}
                      required={index === 0 || term.startDate !== ''}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Dialog>

      {/* Edit Term Modal */}
      <Dialog
        open={showTermModal}
        onOpenChange={(open) => !open && setShowTermModal(false)}
        title={editingTerm ? 'Edit Term' : 'Add Term'}
        maxWidth={600}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowTermModal(false)}>Cancel</button>
            <button type="submit" form="term-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Term'}
            </button>
          </>
        }
      >
        <form id="term-form" onSubmit={handleTermSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="termNameModal">Term Name</label>
              <input 
                id="termNameModal"
                className="form-input" 
                placeholder="e.g. Term 1" 
                value={termForm.name}
                onChange={e => setTermForm({...termForm, name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="academicYearModal">Academic Year</label>
              <input 
                id="academicYearModal"
                className="form-input" 
                placeholder="e.g. 2023/2024" 
                value={termForm.academicYear}
                onChange={e => setTermForm({...termForm, academicYear: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="startDateModal">Start Date</label>
              <input 
                id="startDateModal"
                type="date" 
                className="form-input" 
                value={termForm.startDate}
                onChange={e => setTermForm({...termForm, startDate: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="endDateModal">End Date</label>
              <input 
                id="endDateModal"
                type="date" 
                className="form-input" 
                value={termForm.endDate}
                onChange={e => setTermForm({...termForm, endDate: e.target.value})}
                required 
              />
            </div>
          </div>
        </form>
      </Dialog>

      {/* Break Modal */}
      <Dialog
        open={showBreakModal}
        onOpenChange={(open) => !open && setShowBreakModal(false)}
        title="Add Mid-term Break"
        maxWidth={450}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowBreakModal(false)}>Cancel</button>
            <button type="submit" form="break-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Break'}
            </button>
          </>
        }
      >
        <form id="break-form" onSubmit={handleBreakSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <label htmlFor="breakName">Break Name</label>
              <input 
                id="breakName"
                className="form-input" 
                placeholder="e.g. Mid-term break" 
                value={breakForm.name}
                onChange={e => setBreakForm({...breakForm, name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="breakStartDate">Start Date</label>
              <input 
                id="breakStartDate"
                type="date" 
                className="form-input" 
                value={breakForm.startDate}
                onChange={e => setBreakForm({...breakForm, startDate: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="breakEndDate">End Date</label>
              <input 
                id="breakEndDate"
                type="date" 
                className="form-input" 
                value={breakForm.endDate}
                onChange={e => setBreakForm({...breakForm, endDate: e.target.value})}
                required 
              />
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTermConfirm}
        onOpenChange={(open) => !open && setDeleteTermConfirm(null)}
        title="Delete Term"
        message="Are you sure you want to delete this term? All associated breaks will be removed."
        onConfirm={executeDeleteTerm}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={!!deleteBreakConfirm}
        onOpenChange={(open) => !open && setDeleteBreakConfirm(null)}
        title="Delete Break"
        message="Are you sure you want to delete this break?"
        onConfirm={executeDeleteBreak}
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
