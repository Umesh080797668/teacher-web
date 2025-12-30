import axios, { InternalAxiosRequestConfig } from 'axios';
import type { Teacher, Student, Class, Attendance, Payment } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Teachers API
export const teachersApi = {
  getAll: (companyId?: string) => 
    api.get<Teacher[]>('/api/teachers', { params: { companyId } }),
  getById: (id: string) => api.get<Teacher>(`/api/teachers/${id}`),
  create: (data: Partial<Teacher>) => api.post<Teacher>('/api/teachers', data),
  update: (id: string, data: Partial<Teacher>) => api.put<Teacher>(`/api/teachers/${id}`, data),
  updateStatus: (id: string, status: string) => 
    api.put(`/api/teachers/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/api/teachers/${id}`),
  getCompanyTeachers: (companyId: string) => 
    api.get<Teacher[]>(`/api/teachers/company/${companyId}`),
};

// Students API
export const studentsApi = {
  getAll: (teacherId?: string) => 
    api.get<Student[]>('/api/students', { params: { teacherId } }),
  getById: (id: string) => api.get<Student>(`/api/students/${id}`),
  create: (data: Partial<Student>) => api.post<Student>('/api/students', data),
  update: (id: string, data: Partial<Student>) => 
    api.put<Student>(`/api/students/${id}`, data),
  delete: (id: string) => api.delete(`/api/students/${id}`),
};

// Classes API
export const classesApi = {
  getAll: (teacherId?: string) => 
    api.get<Class[]>('/api/classes', { params: { teacherId } }),
  getById: (id: string) => api.get<Class>(`/api/classes/${id}`),
  create: (data: Partial<Class>) => api.post<Class>('/api/classes', data),
  update: (id: string, data: Partial<Class>) => 
    api.put<Class>(`/api/classes/${id}`, data),
  delete: (id: string) => api.delete(`/api/classes/${id}`),
};

// Attendance API
export const attendanceApi = {
  getAll: (params?: { 
    studentId?: string; 
    classId?: string; 
    month?: number; 
    year?: number;
    teacherId?: string;
  }) => api.get<Attendance[]>('/api/attendance', { params }),
  create: (data: Partial<Attendance>) => api.post<Attendance>('/api/attendance', data),
  bulkCreate: (data: Partial<Attendance>[]) => 
    api.post<Attendance[]>('/api/attendance/bulk', data),
  update: (id: string, data: Partial<Attendance>) => 
    api.put<Attendance>(`/api/attendance/${id}`, data),
  delete: (id: string) => api.delete(`/api/attendance/${id}`),
};

// Payments API
export const paymentsApi = {
  getAll: (params?: { studentId?: string; classId?: string; teacherId?: string }) => 
    api.get<Payment[]>('/api/payments', { params }),
  create: (data: Partial<Payment>) => api.post<Payment>('/api/payments', data),
  delete: (id: string) => api.delete(`/api/payments/${id}`),
};

// Reports API
export const reportsApi = {
  getAttendanceSummary: (params: { month: number; year: number; teacherId?: string }) =>
    api.get('/api/reports/attendance-summary', { params }),
  getStudentReports: (params: { month: number; year: number; teacherId?: string }) =>
    api.get('/api/reports/student-reports', { params }),
  getClassStudentDetails: (params: { classId: string; month: number; year: number }) =>
    api.get('/api/reports/class-student-details', { params }),
};

// Web Session API
export const sessionApi = {
  generateQR: (companyId?: string) => 
    api.post('/api/web-session/generate-qr', { companyId }),
  verifySession: (sessionId: string) => 
    api.post('/api/web-session/verify', { sessionId }),
  checkAuth: (sessionId: string) =>
    api.get(`/api/web-session/check-auth/${sessionId}`),
  disconnectSession: (sessionId: string) => 
    api.post('/api/web-session/disconnect', { sessionId }),
  getActiveSessions: (companyId?: string) => 
    api.get('/api/web-session/active', { params: { companyId } }),
  getTeacherSessions: (companyId: string) => 
    api.get(`/api/web-session/teacher-sessions/${companyId}`),
  logoutTeacherSession: (sessionId: string) => 
    api.post('/api/web-session/logout-teacher', { sessionId }),
  getTeacherData: (sessionId: string) =>
    api.get(`/api/web-session/teacher-data/${sessionId}`),
  getActiveTeachers: (companyId: string) =>
    api.get(`/api/admin/active-teachers/${companyId}`),
};

// Admin API
export const adminApi = {
  login: (email: string, password: string) => 
    api.post('/api/admin/login', { email, password }),
  register: (data: { email: string; password: string; name: string; companyName: string }) => 
    api.post('/api/admin/register', data),
  getProfile: () => api.get('/api/admin/profile'),
  updateProfile: (data: { name?: string; companyName?: string }) => 
    api.put('/api/admin/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/api/admin/change-password', data),
};

export default api;
