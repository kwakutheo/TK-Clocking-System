'use client';
import { useState, FormEvent, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function TenantLoginPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  
  // Unwrap the promise-based params in Next.js App Router
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const [step, setStep] = useState<'login' | 'forgot-request' | 'forgot-reset'>('login');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Global UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // ✅ We pass the tenantSlug to the login API!
      const res = await authApi.login(identifier, password, tenantSlug);
      const { access_token, user } = res.data;

      const allowed = ['supervisor', 'hr_admin', 'super_admin'];
      if (!allowed.includes(user.role)) {
        setError('Access denied. Employee-only accounts cannot log into the dashboard.');
        setLoading(false);
        return;
      }

      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <button 
        className="theme-toggle-btn"
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: '24px', right: '24px', width: '44px', height: '44px',
          borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'all 0.2s ease',
        }}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {/* Note: Later we can load a dynamic logo based on the tenant slug from an API */}
          <Image
            src="/logo.png"
            alt={`${tenantSlug} Logo`}
            width={72}
            height={72}
            style={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            priority
          />
        </div>
        
        {step === 'login' && (
          <>
            {/* The title dynamically welcomes them to their specific school! */}
            <h1 className="login-title" style={{ textTransform: 'capitalize' }}>
              {tenantSlug.replace(/-/g, ' ')} Portal
            </h1>
            <p className="login-sub">HR & Admin Dashboard — Sign in</p>

            <form className="login-form" onSubmit={handleLoginSubmit}>
              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter your username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
