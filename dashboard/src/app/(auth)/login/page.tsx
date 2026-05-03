'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<'login' | 'forgot-request' | 'forgot-reset'>('login');
  
  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Forgot Password State
  const [email, setEmail] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Global UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authApi.login(identifier, password);
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

  async function handleForgotRequestSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authApi.requestPasswordReset(email);
      setSuccess(res.data.message || 'If that email is registered, a reset link has been sent.');
      setTimeout(() => {
        setStep('forgot-reset');
        setSuccess('');
        setError('');
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to request reset.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotResetSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.completePasswordReset({ username: resetUsername, pin, newPassword });
      setSuccess('Password reset successfully! You can now log in.');
      setTimeout(() => {
        setStep('login');
        setSuccess('');
        setError('');
        setIdentifier(resetUsername);
        setPassword('');
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to reset password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Image
            src="/logo.png"
            alt="TK Clocking Logo"
            width={72}
            height={72}
            style={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            priority
          />
        </div>
        
        {step === 'login' && (
          <>
            <h1 className="login-title">TK Clocking</h1>
            <p className="login-sub">HR & Admin Dashboard — Sign in to continue</p>

            <form className="login-form" onSubmit={handleLoginSubmit}>
              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success" style={{ color: 'var(--success)', marginBottom: 12, fontSize: 14 }}>{success}</div>}

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
                  <span 
                    style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => { setStep('forgot-request'); setError(''); setSuccess(''); }}
                  >
                    Forgot Password?
                  </span>
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </>
        )}

        {step === 'forgot-request' && (
          <>
            <h1 className="login-title">Reset Password</h1>
            <p className="login-sub">Enter your email to receive a reset PIN</p>

            <form className="login-form" onSubmit={handleForgotRequestSubmit}>
              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success" style={{ color: 'var(--success)', marginBottom: 12, fontSize: 14 }}>{success}</div>}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? 'Sending…' : 'Send Reset PIN'}
              </button>
              
              <button
                type="button"
                className="btn btn-outline"
                style={{ justifyContent: 'center', marginTop: 8, width: '100%' }}
                onClick={() => { setStep('login'); setError(''); setSuccess(''); }}
              >
                Back to Login
              </button>
              
              <p 
                style={{ marginTop: 16, fontSize: 12, color: 'var(--primary)', cursor: 'pointer', textAlign: 'center', fontWeight: 500 }}
                onClick={() => { setStep('forgot-reset'); setError(''); setSuccess(''); }}
              >
                Already have a PIN?
              </p>
            </form>
          </>
        )}

        {step === 'forgot-reset' && (
          <>
            <h1 className="login-title">Set New Password</h1>
            <p className="login-sub">Enter your PIN and a new password</p>

            <form className="login-form" onSubmit={handleForgotResetSubmit}>
              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success" style={{ color: 'var(--success)', marginBottom: 12, fontSize: 14 }}>{success}</div>}

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter your username"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reset PIN</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="123456"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
              
              <button
                type="button"
                className="btn btn-outline"
                style={{ justifyContent: 'center', marginTop: 8, width: '100%' }}
                onClick={() => { setStep('login'); setError(''); setSuccess(''); }}
              >
                Back to Login
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Employee app available on Android & iOS
        </p>
      </div>
    </div>
  );
}
