'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store';
import { teachersApi, sessionApi, classesApi, studentsApi, attendanceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Teacher, AdminUser, ActiveTeacherData, Class, Student, Attendance } from '@/lib/types';
import { useAdminPreferences } from '@/lib/useAdminPreferences';

interface UnifiedTeacherData extends ActiveTeacherData {
  classes: Class[];
  students: Student[];
  todayAttendance: Attendance[];
  isExpanded: boolean;
}

export default function UnifiedDashboard() {
  const router = useRouter();
  const { user, userType, isAuthenticated, logout } = useAuthStore();
  const { preferences } = useAdminPreferences();
  const [teachers, setTeachers] = useState<UnifiedTeacherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const qrCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const adminUser = user as AdminUser;
  const companyId = adminUser?._id;

  useEffect(() => {
    if (!isAuthenticated || userType !== 'admin') {
      router.push('/login/admin');
      return;
    }
    loadActiveTeachers();
    
    // Start polling based on preferences
    if (preferences.autoRefresh) {
      pollingRef.current = setInterval(() => {
        loadActiveTeachers();
      }, preferences.refreshInterval * 1000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (qrCheckIntervalRef.current) {
        clearInterval(qrCheckIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userType, router, preferences.autoRefresh, preferences.refreshInterval]);

  const loadActiveTeachers = async () => {
    if (!companyId) return;
    
    try {
      const response = await sessionApi.getActiveTeachers(companyId);
      const activeTeachers = response.data.teachers || [];
      
      // Load detailed data for each teacher
      const detailedTeachers = await Promise.all(
        activeTeachers.map(async (teacher: ActiveTeacherData) => {
          try {
            const [classesRes, studentsRes, attendanceRes] = await Promise.all([
              classesApi.getAll(teacher.teacher._id),
              studentsApi.getAll(teacher.teacher._id),
              attendanceApi.getAll({
                teacherId: teacher.teacher._id,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
              }),
            ]);

            // Filter today's attendance
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendanceRes.data.filter(
              (att: Attendance) => att.date.split('T')[0] === today
            );

            return {
              ...teacher,
              classes: classesRes.data,
              students: studentsRes.data,
              todayAttendance,
              isExpanded: false,
            };
          } catch (error) {
            console.error(`Error loading data for teacher ${teacher.teacher.name}:`, error);
            return {
              ...teacher,
              classes: [],
              students: [],
              todayAttendance: [],
              isExpanded: false,
            };
          }
        })
      );

      setTeachers(detailedTeachers);
    } catch (error) {
      console.error('Error loading active teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!companyId) {
      toast.error('System error: Company ID missing');
      return;
    }

    try {
      const response = await sessionApi.generateQR(companyId);
      const { sessionId, qrCode } = response.data;
      
      setQrCodeData(qrCode);
      toast.success('QR Code generated!');

      if (qrCheckIntervalRef.current) {
        clearInterval(qrCheckIntervalRef.current);
      }

      qrCheckIntervalRef.current = setInterval(async () => {
        try {
          const verifyResponse = await sessionApi.verifySession(sessionId);
          if (verifyResponse.data.authenticated) {
            clearInterval(qrCheckIntervalRef.current!);
            setQrCodeData('');
            toast.success('Teacher logged in!');
            await loadActiveTeachers();
          }
        } catch (error) {
          // Continue polling
        }
      }, 2000);

      setTimeout(() => {
        if (qrCheckIntervalRef.current) {
          clearInterval(qrCheckIntervalRef.current);
          setQrCodeData('');
          toast.error('QR Code expired');
        }
      }, 300000);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const handleLogoutTeacher = async (sessionId: string, teacherName: string) => {
    try {
      await sessionApi.logoutTeacherSession(sessionId);
      toast.success(`${teacherName} logged out`);
      await loadActiveTeachers();
    } catch (error) {
      console.error('Error logging out teacher:', error);
      toast.error('Failed to logout teacher');
    }
  };

  const toggleTeacherExpanded = (sessionId: string) => {
    setTeachers(teachers.map(t => 
      t.sessionId === sessionId ? { ...t, isExpanded: !t.isExpanded } : t
    ));
  };

  const handleMarkAttendance = async (teacherId: string, studentId: string, status: 'present' | 'absent' | 'late') => {
    try {
      const today = new Date();
      await attendanceApi.create({
        studentId,
        date: today.toISOString(),
        status,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        session: 'morning',
      });
      toast.success(`Attendance marked as ${status}`);
      await loadActiveTeachers();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/admin')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">🎯 Unified Teacher Management</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage all {teachers.length} active teachers in one place
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live</span>
              </div>
              
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <span>{adminUser?.name}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-4 top-16 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => router.push('/dashboard/admin/settings')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/admin')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    📊 Classic View
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                >
                  📇
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                >
                  📋
                </button>
              </div>

              <button
                onClick={handleGenerateQR}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                📱 Add Teacher
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredTeachers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No teachers found' : 'No active teachers'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery ? 'Try a different search term' : 'Generate a QR code to let teachers login'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleGenerateQR}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                📱 Generate QR Code
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <TeacherCard
                key={teacher.sessionId}
                teacher={teacher}
                onLogout={handleLogoutTeacher}
                onToggleExpand={toggleTeacherExpanded}
                onMarkAttendance={handleMarkAttendance}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTeachers.map((teacher) => (
              <TeacherListItem
                key={teacher.sessionId}
                teacher={teacher}
                onLogout={handleLogoutTeacher}
                onToggleExpand={toggleTeacherExpanded}
                onMarkAttendance={handleMarkAttendance}
              />
            ))}
          </div>
        )}
      </main>

      {/* QR Modal */}
      {qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              Scan to Add Teacher
            </h3>
            <div className="bg-white p-4 rounded-lg mb-4">
              <Image src={qrCodeData} alt="QR Code" width={256} height={256} className="mx-auto" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400 mb-3">
                <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                <p className="font-medium">Waiting for scan...</p>
              </div>
              <button
                onClick={() => {
                  if (qrCheckIntervalRef.current) clearInterval(qrCheckIntervalRef.current);
                  setQrCodeData('');
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Teacher Card Component (Grid View)
function TeacherCard({ 
  teacher, 
  onLogout, 
  onToggleExpand,
  onMarkAttendance 
}: { 
  teacher: UnifiedTeacherData;
  onLogout: (sessionId: string, name: string) => void;
  onToggleExpand: (sessionId: string) => void;
  onMarkAttendance: (teacherId: string, studentId: string, status: 'present' | 'absent' | 'late') => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold">{teacher.teacher.name}</h3>
            <p className="text-sm opacity-90">{teacher.teacher.email}</p>
            <p className="text-xs opacity-75 mt-1">ID: {teacher.teacher.teacherId}</p>
          </div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">👨‍🏫</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teacher.classes.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Classes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{teacher.students.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Students</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{teacher.stats.todayPresent}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{teacher.stats.todayAbsent}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="p-4 space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Connected: {new Date(teacher.connectedAt).toLocaleString()}
        </div>
        
        {/* Classes List */}
        {teacher.classes.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Classes:</div>
            <div className="flex flex-wrap gap-1">
              {teacher.classes.slice(0, 3).map((cls) => (
                <span
                  key={cls._id}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                >
                  {cls.name}
                </span>
              ))}
              {teacher.classes.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                  +{teacher.classes.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
        <button
          onClick={() => onToggleExpand(teacher.sessionId)}
          className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          {teacher.isExpanded ? '📊 Hide Details' : '📊 View Details'}
        </button>
        <button
          onClick={() => onLogout(teacher.sessionId, teacher.teacher.name)}
          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
          title="Logout"
        >
          🚪
        </button>
      </div>

      {/* Expanded Details */}
      {teacher.isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
          {/* Students with Quick Attendance */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Today's Attendance</h4>
            {teacher.students.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No students yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teacher.students.slice(0, 10).map((student) => {
                  const attendance = teacher.todayAttendance.find(a => a.studentId === student._id);
                  return (
                    <div
                      key={student._id}
                      className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {student.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{student.studentId}</div>
                      </div>
                      {attendance ? (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            attendance.status === 'present'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : attendance.status === 'absent'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {attendance.status}
                        </span>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher._id, student._id, 'present')}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            title="Present"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher._id, student._id, 'absent')}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            title="Absent"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Teacher List Item Component (List View)
function TeacherListItem({ 
  teacher, 
  onLogout, 
  onToggleExpand,
  onMarkAttendance 
}: { 
  teacher: UnifiedTeacherData;
  onLogout: (sessionId: string, name: string) => void;
  onToggleExpand: (sessionId: string) => void;
  onMarkAttendance: (teacherId: string, studentId: string, status: 'present' | 'absent' | 'late') => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{teacher.teacher.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.teacher.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{teacher.classes.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Classes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{teacher.students.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Students</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{teacher.stats.todayPresent}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{teacher.stats.todayAbsent}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onToggleExpand(teacher.sessionId)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                {teacher.isExpanded ? '↑ Collapse' : '↓ Expand'}
              </button>
              <button
                onClick={() => onLogout(teacher.sessionId, teacher.teacher.name)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {teacher.isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Classes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Classes</h4>
              <div className="space-y-1">
                {teacher.classes.map((cls) => (
                  <div key={cls._id} className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                    {cls.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Students */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Students - Today's Attendance</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {teacher.students.map((student) => {
                  const attendance = teacher.todayAttendance.find(a => a.studentId === student._id);
                  return (
                    <div key={student._id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{student.studentId}</div>
                      </div>
                      {attendance ? (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            attendance.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {attendance.status}
                        </span>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher._id, student._id, 'present')}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            ✓ Present
                          </button>
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher._id, student._id, 'absent')}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            ✗ Absent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
