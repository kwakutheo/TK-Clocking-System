'use client';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import QRCode from 'qrcode';
import { branchesApi } from '@/lib/api';

const fetcher = () => branchesApi.list().then((r) => r.data);

function QrCodeImage({ text, size = 180 }: { text: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 2, color: { dark: '#000', light: '#fff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [text, size]);

  if (!dataUrl) return <div style={{ width: size, height: size, background: 'rgba(0,0,0,0.1)', borderRadius: 8 }} />;

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      style={{ width: size, height: size, borderRadius: 8, border: '1px solid var(--border)' }}
    />
  );
}

function PasswordModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isLoading: boolean;
}) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg, #1e1e2e)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 380,
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Confirm Password</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Enter your login password to regenerate this branch QR code. The old code will become invalid immediately.
        </div>

        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && password.length >= 6 && !isLoading) {
              onConfirm(password);
            }
          }}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.2)',
            color: 'inherit',
            fontSize: 14,
            marginBottom: 20,
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(password)}
            disabled={password.length < 6 || isLoading}
            className="btn btn-primary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {isLoading ? '⏳ Verifying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchCard({ branch, onEdit, onDelete, canDelete }: { branch: any; onEdit: () => void; onDelete: () => void; canDelete: boolean }) {
  const [qrCode, setQrCode] = useState<string | null>(branch.qrCode ?? null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleRegenerate = async (password: string) => {
    setIsRegenerating(true);
    try {
      const res = await branchesApi.regenerateQr(branch.id, password);
      setQrCode(res.data.qrCode);
      setShowPasswordModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to regenerate QR code.';
      alert(msg);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      alert('QR code copied to clipboard!');
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${branch.name}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
            .container { text-align: center; padding: 40px; }
            img { width: 300px; height: 300px; border: 2px solid #000; border-radius: 12px; }
            h1 { margin: 24px 0 8px; font-size: 28px; }
            p { margin: 0; color: #666; font-size: 16px; }
            .hint { margin-top: 24px; padding: 12px 20px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #374151; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${printRef.current.querySelector('img')?.src}" alt="QR Code" />
            <h1>${branch.name}</h1>
            <p>Scan to clock in / out</p>
            <div class="hint no-print">Print this page and paste it at the branch entrance.</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{branch.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Branch ID: {branch.id.slice(0, 8)}…</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Edit</button>
          {canDelete && (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑️ Delete</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: '📍 Latitude', value: branch.latitude ? Number(branch.latitude).toFixed(6) : 'Not set' },
          { label: '📍 Longitude', value: branch.longitude ? Number(branch.longitude).toFixed(6) : 'Not set' },
          { label: '📏 Geofence Radius', value: branch.allowedRadius ? `${branch.allowedRadius}m` : '—' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
        {branch.latitude && branch.longitude ? (
          <a
            href={`https://maps.google.com/?q=${branch.latitude},${branch.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            🗺 View on Google Maps
          </a>
        ) : (
          <div />
        )}
      </div>

      {/* QR Code Section */}
      <div style={{ marginTop: 16, padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>QR Code (print & paste at branch)</div>
        {qrCode ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div ref={printRef}>
                <QrCodeImage text={qrCode} size={180} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handlePrint} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                🖨️ Print
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                disabled={isRegenerating}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {isRegenerating ? '⏳' : '🔄'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              No QR code generated yet.
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              disabled={isRegenerating}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isRegenerating ? '⏳ Generating…' : '⚡ Generate QR Code'}
            </button>
          </>
        )}
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleRegenerate}
        isLoading={isRegenerating}
      />

    </div>
  );
}

export default function BranchesPage() {
  const { data, isLoading, mutate } = useSWR('branches', fetcher);
  const branches: any[] = data ?? [];
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadius: '300',
  });
  const [mapsUrl, setMapsUrl] = useState('');

  const resetForm = () => {
    setForm({ name: '', latitude: '', longitude: '', allowedRadius: '300' });
    setMapsUrl('');
    setEditingId(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (branch: any) => {
    setForm({
      name: branch.name ?? '',
      latitude: branch.latitude != null ? String(branch.latitude) : '',
      longitude: branch.longitude != null ? String(branch.longitude) : '',
      allowedRadius: branch.allowedRadius != null ? String(branch.allowedRadius) : '300',
    });
    setMapsUrl('');
    setEditingId(branch.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const payload = {
      name: form.name,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      allowedRadius: form.allowedRadius ? Number(form.allowedRadius) : undefined,
    };

    try {
      if (editingId) {
        await branchesApi.update(editingId, payload);
      } else {
        await branchesApi.create(payload);
      }
      await mutate();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await branchesApi.delete(id);
      await mutate();
      setDeleteConfirm(null);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to delete branch.');
    }
  };

  const [userRole, setUserRole] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(JSON.parse(localStorage.getItem('user') ?? '{}')?.role ?? '');
    }
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Branches</h1>
        <p className="page-subtitle">Physical attendance locations and geofence settings</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Branch</button>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {branches.map((branch: any) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={() => openEdit(branch)}
              onDelete={() => setDeleteConfirm(branch.id)}
              canDelete={userRole === 'super_admin'}
            />
          ))}

          {branches.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">📍</div>
              <p className="empty-state-text">No branches configured yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Branch' : 'Add Branch'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Branch Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Google Maps URL <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(paste to auto-fill coordinates)</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={mapsUrl}
                    placeholder="https://www.google.com/maps/place/..."
                    onChange={(e) => {
                      const url = e.target.value;
                      setMapsUrl(url);
                      const match = url.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
                      if (match) {
                        setForm((prev) => ({ ...prev, latitude: match[1], longitude: match[2] }));
                      }
                    }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <a
                    href={`https://www.google.com/maps/@${form.latitude || '0'},${form.longitude || '0'},15z`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={(e) => {
                      if (!form.latitude || !form.longitude) {
                        e.preventDefault();
                        window.open('https://www.google.com/maps', '_blank');
                      }
                    }}
                  >
                    🗺 Pick on Google Maps
                  </a>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Right-click a spot → copy coordinates → paste above
                  </span>
                </div>
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="e.g. 5.6037"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="e.g. -0.1870"
                  />
                </div>
                <div className="form-group">
                  <label>Geofence Radius (meters)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.allowedRadius}
                    onChange={(e) => setForm({ ...form, allowedRadius: e.target.value })}
                    placeholder="300"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Branch'}
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
              <h3>Delete Branch</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p>Are you sure you want to delete this branch? This action cannot be undone.</p>
            <div className="modal-footer">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
