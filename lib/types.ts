export interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  teacherId: string;
  status: 'active' | 'inactive';
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  _id: string;
  name: string;
  email?: string;
  studentId: string;
  classId?: string;
  createdAt?: string;
}

export interface Class {
  _id: string;
  name: string;
  teacherId: string;
  createdAt?: string;
}

export interface Attendance {
  _id: string;
  studentId: string;
  date: string;
  session: string;
  status: 'present' | 'absent' | 'late';
  month: number;
  year: number;
  createdAt?: string;
}

export interface Payment {
  _id: string;
  studentId: string;
  classId: string;
  amount: number;
  type: 'full' | 'half' | 'free';
  date: string;
  createdAt?: string;
}

export interface WebSession {
  sessionId: string;
  userId: string;
  userType: 'admin' | 'teacher';
  deviceId: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  teacherId?: string; // For teacher sessions
}

export interface QRCodeData {
  sessionId: string;
  timestamp?: number;
  expiresAt?: number;
}

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  companyName: string;
  role: 'admin';
}

export interface AuthResponse {
  success: boolean;
  session?: WebSession;
  user?: Teacher | AdminUser;
  token?: string;
  message?: string;
}
