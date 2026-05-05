'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore, initials, roleLabel } from '@/lib/store';
import { fetchAndCachePermissions } from '@/lib/permissions';
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  MapPin, 
  Building2, 
  UserCircle, 
  LogOut, 
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ChevronLeft,
  Menu,
  Sun,
  Moon
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Overview'    },
  { href: '/attendance',  icon: Clock,            label: 'Attendance'   },
  { href: '/employees',   icon: Users,            label: 'Employees'    },
  { href: '/shifts',      icon: Clock,            label: 'Shifts'       },
  { href: '/holidays',    icon: Calendar,         label: 'Holidays'     },
  { href: '/calendar',    icon: Calendar,         label: 'Academic Calendar', roles: ['hr_admin', 'super_admin'] },
  { href: '/audit',       icon: ShieldCheck,      label: 'Audit Logs',    roles: ['super_admin'] },
  { href: '/permissions', icon: ShieldAlert,      label: 'Permissions',   roles: ['super_admin'] },
  { href: '/departments', icon: Building2,        label: 'Departments'  },
  { href: '/branches',    icon: MapPin,           label: 'Branches'     },
  { href: '/profile',     icon: UserCircle,       label: 'My Profile'   },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, hydrate, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => { 
    hydrate(); 
    fetchAndCachePermissions();
  }, [hydrate]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved === 'true') setCollapsed(true);
      
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

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    if (isHydrated && !user) router.push('/login');
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Mobile Header ────────────────────────────────────────────────── */}
      <header className="mobile-header">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="mobile-logo">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            style={{ borderRadius: '6px' }}
          />
          <span>TK Clocking</span>
        </div>
        <button 
          className="mobile-theme-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div 
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`} 
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Image
              src="/logo.png"
              alt="TK Clocking Logo"
              width={36}
              height={36}
              style={{ borderRadius: '8px', flexShrink: 0 }}
              priority
            />
            <div>
              <div className="sidebar-logo-text">TK Clocking</div>
              <div className="sidebar-logo-sub">HR Dashboard</div>
            </div>
          </div>
          <button 
            className="sidebar-toggle" 
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="sidebar-nav">
          <span className="nav-section-label">Main Menu</span>
          <nav>
            {NAV.filter(item => !item.roles || item.roles.includes(user?.role || '')).map((item) => {
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="nav-item-icon"><Icon size={18} /></span>
                  {(collapsed && !mobileOpen) ? null : item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-card" title={collapsed ? user.fullName : undefined}>
            <div className="user-avatar" style={{ 
              background: 'linear-gradient(135deg, var(--primary), #a855f7)',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
            }}>{initials(user.fullName)}</div>
            {(!collapsed || mobileOpen) && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name" style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  {user.fullName}
                </div>
                <div className="user-role" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {roleLabel[user.role]}
                </div>
              </div>
            )}
            {(!collapsed || mobileOpen) && (
              <button
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="btn-ghost"
                style={{ padding: '6px', borderRadius: '8px', minWidth: 'auto' }}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="main-content" style={{ position: 'relative' }}>
        <button 
          className="theme-toggle-btn desktop-only"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          style={{
            position: 'absolute',
            top: '24px',
            right: '32px',
            zIndex: 10,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {children}
      </main>
    </div>
  );
}
