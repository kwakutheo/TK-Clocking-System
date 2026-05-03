import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach token from localStorage on every request ────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Redirect to login on 401 ───────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (identifier: string, password: string) =>
    api.post('/auth/login', { identifier, password }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: {
    fullName?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
  }) => api.patch('/employees/me', data),
  requestPasswordReset: (email: string) =>
    api.post('/auth/request-password-reset', { email }),
  completePasswordReset: (data: { username: string; pin: string; newPassword: string }) =>
    api.post('/auth/complete-password-reset', data),
};

// ── Attendance ─────────────────────────────────────────────────────────────
export const attendanceApi = {
  history: (page = 1, limit = 20) =>
    api.get(`/attendance/history?page=${page}&limit=${limit}`),
  live: () => api.get('/attendance/live'),
  stats: () => api.get('/attendance/stats'),
  list: (params: any) => api.get('/attendance', { params }),
  getReport: (employeeId: string, month: number, year: number) =>
    api.get(`/attendance/report/${employeeId}`, { params: { month, year } }),
  getTermReport: (employeeId: string, termId: string) =>
    api.get(`/attendance/report/${employeeId}/term/${termId}`),
};

// ── Holidays ───────────────────────────────────────────────────────────────
export const holidaysApi = {
  list: () => api.get('/holidays'),
  create: (data: any) => api.post('/holidays', data),
  delete: (id: string) => api.delete(`/holidays/${id}`),
};

// ── Shifts ────────────────────────────────────────────────────────────────
export const shiftsApi = {
  list: () => api.get('/shifts'),
  create: (data: any) => api.post('/shifts', data),
  update: (id: string, data: any) => api.patch(`/shifts/${id}`, data),
  delete: (id: string) => api.delete(`/shifts/${id}`),
};

// ── Employees ──────────────────────────────────────────────────────────────
export const employeesApi = {
  list: () => api.get('/employees'),
  getById: (id: string) => api.get(`/employees/${id}`),
  register: (data: {
    fullName: string;
    username: string;
    password: string;
    employeeCode?: string;
    departmentId?: string;
    branchId?: string;
    shiftId?: string;
    position?: string;
    hireDate?: string;
    phone?: string;
    salary?: number;
    overtimeRate?: number;
    latenessDeductionAmount?: number;
    role?: string;
  }) => api.post('/employees', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  resetPassword: (id: string, adminPassword: string) =>
    api.post(`/employees/${id}/reset-password`, { adminPassword }),
};

// ── Academic Calendar ─────────────────────────────────────────────────────
export const calendarApi = {
  listTerms: () => api.get('/academic-calendar/terms'),
  createTerm: (data: any) => api.post('/academic-calendar/terms', data),
  updateTerm: (id: string, data: any) => api.put(`/academic-calendar/terms/${id}`, data),
  deleteTerm: (id: string) => api.delete(`/academic-calendar/terms/${id}`),
  createBreak: (termId: string, data: any) => api.post(`/academic-calendar/terms/${termId}/breaks`, data),
  deleteBreak: (id: string) => api.delete(`/academic-calendar/breaks/${id}`),
};

// ── Departments ────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data: { name: string }) => api.post('/departments', data),
  update: (id: string, data: { name: string }) => api.patch(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

// ── Branches ───────────────────────────────────────────────────────────────
export const branchesApi = {
  list: () => api.get('/branches'),
  create: (data: { name: string; latitude?: number; longitude?: number; allowedRadius?: number }) =>
    api.post('/branches', data),
  update: (id: string, data: { name?: string; latitude?: number; longitude?: number; allowedRadius?: number }) =>
    api.patch(`/branches/${id}`, data),
  delete: (id: string) => api.delete(`/branches/${id}`),
  getQr: (id: string) => api.get(`/branches/${id}/qr-code`),
  regenerateQr: (id: string, password: string) => api.post(`/branches/${id}/qr-code`, { password }),
};

// ── Audit Logs ─────────────────────────────────────────────────────────────
export const auditApi = {
  list: () => api.get('/audit'),
};
