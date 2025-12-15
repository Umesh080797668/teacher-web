'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useTheme } from '@/lib/ThemeContext';
import { teachersApi, classesApi, studentsApi, attendanceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Teacher, Class, Student } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'classes' | 'students' | 'payments' | 'records' | 'reports'>('overview');
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalClasses: 0,
    totalStudents: 0,
    activeTeachers: 0,
    todayAttendancePercentage: 85,
    paymentStatusPercentage: 75,
  });
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (!isAuthenticated || userType !== 'admin') {
      router.push('/login/admin');
      return;
    }
    loadData();
  }, [isAuthenticated, userType, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teachersRes, classesRes, studentsRes] = await Promise.all([
        teachersApi.getAll(),
        classesApi.getAll(),
        studentsApi.getAll(),
      ]);

      const teachersData = teachersRes.data;
      const classesData = classesRes.data;
      const studentsData = studentsRes.data;

      setTeachers(teachersData);
      setClasses(classesData);
      setStudents(studentsData);

      setStats({
        totalTeachers: teachersData.length,
        totalClasses: classesData.length,
        totalStudents: studentsData.length,
        activeTeachers: teachersData.filter((t: Teacher) => t.status === 'active').length,
        todayAttendancePercentage: 85,
        paymentStatusPercentage: 75,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeacher = async () => {
    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await teachersApi.create(newTeacher);
      toast.success('Teacher created successfully');
      setShowTeacherModal(false);
      setNewTeacher({ name: '', email: '', phone: '', password: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      toast.error(error.response?.data?.error || 'Failed to create teacher');
    }
  };

  const handleToggleTeacherStatus = async (teacher: Teacher) => {
    try {
      const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
      await teachersApi.updateStatus(teacher._id, newStatus);
      toast.success(`Teacher ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      console.error('Error updating teacher status:', error);
      toast.error('Failed to update teacher status');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login/admin');
  };

  const getTeacherClasses = (teacherId: string) => {
    return classes.filter(c => c.teacherId === teacherId);
  };

  const getClassStudents = (classId: string) => {
    return students.filter(s => s.classId === classId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--foreground)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Admin Dashboard</h1>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                style={{ color: 'var(--foreground)' }}
                title="Toggle theme"
              >
                {theme === 'dark' ? '🌞' : '🌙'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium rounded-lg transition border cursor-pointer"
                style={{ 
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'teachers', name: 'Teachers', icon: '👥' },
              { id: 'classes', name: 'Classes', icon: '🏫' },
              { id: 'students', name: 'Students', icon: '🎓' },
              { id: 'payments', name: 'Payments', icon: '💳' },
              { id: 'records', name: 'View Records', icon: '📋' },
              { id: 'reports', name: 'Reports', icon: '📈' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{ color: activeTab === tab.id ? undefined : 'var(--foreground)' }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid - Matching Mobile App */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl shadow-sm p-6 card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Total Students</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: 'var(--foreground)' }}>{stats.totalStudents}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Today's Attendance</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: 'var(--foreground)' }}>{stats.todayAttendancePercentage}%</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Total Classes</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: 'var(--foreground)' }}>{stats.totalClasses}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Payment Status</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: 'var(--foreground)' }}>{stats.paymentStatusPercentage}%</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Teachers */}
            <div className="rounded-xl shadow-sm p-6 card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Recent Teachers</h2>
              <div className="space-y-3">
                {teachers.slice(0, 5).map((teacher) => (
                  <div key={teacher._id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--background)' }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">{teacher.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--foreground)' }}>{teacher.name}</p>
                        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>{teacher.email}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      teacher.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {teacher.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Teachers Management</h2>
              <button
                onClick={() => setShowTeacherModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium cursor-pointer"
              >
                + Add Teacher
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {teachers.map((teacher) => {
                const teacherClasses = getTeacherClasses(teacher._id);
                const totalStudents = teacherClasses.reduce(
                  (acc, cls) => acc + getClassStudents(cls._id).length,
                  0
                );

                return (
                  <div key={teacher._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{teacher.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                          <p className="text-sm text-gray-500">{teacher.email}</p>
                          {teacher.phone && <p className="text-sm text-gray-500">{teacher.phone}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTeacherStatus(teacher)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          teacher.status === 'active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {teacher.status === 'active' ? '✓ Active' : '○ Inactive'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-sm text-gray-600">Classes</p>
                        <p className="text-2xl font-bold text-gray-900">{teacherClasses.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Students</p>
                        <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                      </div>
                    </div>

                    {teacherClasses.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">Classes:</p>
                        <div className="flex flex-wrap gap-2">
                          {teacherClasses.map((cls) => (
                            <span key={cls._id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {cls.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">All Classes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const teacher = teachers.find(t => t._id === cls.teacherId);
                const classStudents = getClassStudents(cls._id);

                return (
                  <div key={cls._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{cls.name}</h3>
                        {teacher && (
                          <p className="text-sm text-gray-500 mt-1">👤 {teacher.name}</p>
                        )}
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Students</span>
                        <span className="text-2xl font-bold text-gray-900">{classStudents.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">All Students</h2>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => {
                    const studentClass = classes.find(c => c._id === student.classId);
                    const teacher = studentClass ? teachers.find(t => t._id === studentClass.teacherId) : null;

                    return (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-green-600 font-semibold text-sm">{student.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              {student.email && <div className="text-sm text-gray-500">{student.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 font-mono">{student.studentId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {studentClass ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {studentClass.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">No class</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher ? teacher.name : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Payment Management</h2>
            <div className="rounded-xl shadow-sm p-6 card text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
              <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Payment tracking feature coming soon...</p>
            </div>
          </div>
        )}

        {/* View Records Tab */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Attendance Records</h2>
            <div className="rounded-xl shadow-sm p-6 card text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
              <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Attendance records view coming soon...</p>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Reports & Analytics</h2>
            <div className="rounded-xl shadow-sm p-6 card text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
              <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Reports and analytics coming soon...</p>
            </div>
          </div>
        )}
      </main>

      {/* Create Teacher Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl shadow-xl max-w-md w-full p-6 modal-content" style={{ backgroundColor: 'var(--modal-bg)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Add New Teacher</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Name *</label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--input-border)'
                  }}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Email *</label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--input-border)'
                  }}
                  placeholder="teacher@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Phone</label>
                <input
                  type="tel"
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--input-border)'
                  }}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Password *</label>
                <input
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--input-border)'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTeacherModal(false);
                  setNewTeacher({ name: '', email: '', phone: '', password: '' });
                }}
                className="flex-1 px-4 py-2 rounded-lg transition border cursor-pointer"
                style={{ 
                  color: 'var(--foreground)',
                  borderColor: 'var(--border-color)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeacher}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer"
              >
                Create Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
