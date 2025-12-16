export interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  teacherId: string;
  status: 'active' | 'inactive';
  profilePicture?: string;
  companyId?: string; // Company/Admin association
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
  companyId?: string; // For company-specific sessions
}

export interface QRCodeData {
  sessionId: string;
  timestamp?: number;
  expiresAt?: number;
  companyId?: string; // Company-specific QR codes
}

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  companyName: string;
  role: 'admin';
}

export interface TeacherSession {
  _id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  sessionId: string;
  deviceInfo?: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
}

export interface ActiveTeacherData {
  sessionId: string;
  deviceId: string;
  connectedAt: string;
  teacher: {
    _id: string;
    name: string;
    email: string;
    teacherId: string;
    phone?: string;
  };
  stats: {
    classes: number;
    students: number;
    todayPresent: number;
    todayAbsent: number;
    todayTotal: number;
  };
}

export interface TeacherDetailedData {
  session: {
    sessionId: string;
    deviceId: string;
    createdAt: string;
    companyId: string;
  };
  teacher: {
    _id: string;
    name: string;
    email: string;
    teacherId: string;
    phone?: string;
    status: string;
  };
  statistics: {
    totalClasses: number;
    totalStudents: number;
    todayPresent: number;
    todayAbsent: number;
    attendanceMarked: boolean;
  };
  classes: Class[];
  students: Student[];
  recentAttendance: Attendance[];
}

export interface AuthResponse {
  success: boolean;
  session?: WebSession;
  user?: Teacher | AdminUser;
  token?: string;
  message?: string;
}
