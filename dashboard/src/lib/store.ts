'use client';
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  username?: string;
  role: 'employee' | 'supervisor' | 'hr_admin' | 'super_admin';
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,

  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  hydrate: () => {
    const token = localStorage.getItem('access_token');
    const raw = localStorage.getItem('user');
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    set({ user, token, isHydrated: true });
  },
}));

export const initials = (name?: string) =>
  name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() ?? '?';

export const roleLabel: Record<string, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  hr_admin: 'HR Admin',
  super_admin: 'Super Admin',
};
