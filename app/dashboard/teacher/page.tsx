'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useTheme } from '@/lib/ThemeContext';
import { classesApi, studentsApi, attendanceApi, paymentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Class, Student, Attendance, Payment, Teacher } from '@/lib/types';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated, logout, session } = useAuthStore();
  const { theme } = useTheme();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'students' | 'attendance'>('overview');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    classId: '',
    studentId: '',
  });
  const [newClass, setNewClass] = useState({
    name: '',
  });

  const teacher = user as Teacher;
  const teacherId = teacher?.teacherId;

  // Poll for session status to detect disconnection from mobile app
  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher' || !session?.sessionId) {
      return;
    }

    const checkSessionStatus = async () => {
      try {
        const response = await fetch('https://teacher-eight-chi.vercel.app/api/web-session/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session.sessionId }),
        });

        // If session is not found (404) or not valid, logout
        if (response.status === 404) {
          console.log('Session is no longer active, logging out...');
          toast.error('Your session has been disconnected');
          logout();
          router.push('/login');
          return;
        }

        const data = await response.json();
        
        // If session is not valid, logout
        if (!data.valid) {
          console.log('Session is no longer valid, logging out...');
          toast.error('Your session has been disconnected');
          logout();
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking session status:', error);
        // On network error, don't logout - just log the error
      }
    };

    // Check session status every 5 seconds
    const intervalId = setInterval(checkSessionStatus, 5000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, userType, session, logout, router]);

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, userType, router]);

  const loadData = async () => {
    if (!teacherId) return;
    
    setIsLoading(true);
    try {
      const [classesRes, studentsRes] = await Promise.all([
        classesApi.getAll(teacherId),
        studentsApi.getAll(teacherId),
      ]);

      setClasses(classesRes.data);
      setStudents(studentsRes.data);
      
      if (classesRes.data.length > 0 && !selectedClass) {
        setSelectedClass(classesRes.data[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.name) {
      toast.error('Please enter a class name');
      return;
    }

    try {
      await classesApi.create({
        name: newClass.name,
        teacherId: teacher._id,
      });
      toast.success('Class created successfully');
      setShowAddClassModal(false);
      setNewClass({ name: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error(error.response?.data?.error || 'Failed to create class');
    }
  };

  const handleCreateStudent = async () => {
    if (!newStudent.name || !newStudent.classId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await studentsApi.create(newStudent);
      toast.success('Student added successfully');
  setShowAddStudentModal(false);
  setNewStudent({ name: '', email: '', classId: '', studentId: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast.error(error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }

    const classStudents = students.filter(s => s.classId === selectedClass._id);
    const recordsToSave = classStudents
      .filter(s => attendanceRecords[s._id])
      .map(s => ({
        studentId: s._id,
        date: new Date(attendanceDate).toISOString(),
        status: attendanceRecords[s._id],
        session: 'daily',
        month: new Date(attendanceDate).getMonth() + 1,
        year: new Date(attendanceDate).getFullYear(),
      }));

    if (recordsToSave.length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    try {
      await attendanceApi.bulkCreate(recordsToSave);
      toast.success('Attendance marked successfully');
      setAttendanceRecords({});
      loadData();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await classesApi.delete(classId);
      toast.success('Class deleted successfully');
      setDeleteClassId(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error.response?.data?.error || 'Failed to delete class');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await studentsApi.delete(studentId);
      toast.success('Student deleted successfully');
      setDeleteStudentId(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.response?.data?.error || 'Failed to delete student');
    }
  };

  const getClassStudents = (classId: string) => {
    return students.filter(s => s.classId === classId);
  };

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
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {teacher?.name}</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {teacher?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </span>
                </div>
                <span>{teacher?.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                  <button
                    onClick={() => {
                      router.push('/dashboard/teacher/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push('/dashboard/teacher/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'classes', name: 'My Classes', icon: '🏫' },
              { id: 'students', name: 'Students', icon: '🎓' },
              { id: 'attendance', name: 'Mark Attendance', icon: '✓' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
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
            {/* Stats Grid - Enhanced Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Students Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    +0
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{students.length}</p>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>

              {/* Today's Attendance Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    0%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">0%</p>
                <p className="text-sm text-gray-600">Today's Attendance</p>
              </div>

              {/* Total Classes Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    +0
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{classes.length}</p>
                <p className="text-sm text-gray-600">Total Classes</p>
              </div>

              {/* Payment Status Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    0%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">0%</p>
                <p className="text-sm text-gray-600">Payment Status</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition transform hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">✓</div>
                  <h3 className="font-semibold text-lg mb-1">Mark Attendance</h3>
                  <p className="text-sm text-blue-100">Record daily attendance</p>
                </button>

                <button
                  onClick={() => router.push('/dashboard/teacher/attendance-view')}
                  className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition transform hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">📊</div>
                  <h3 className="font-semibold text-lg mb-1">View Records</h3>
                  <p className="text-sm text-green-100">View attendance history</p>
                </button>

                <button
                  onClick={() => router.push('/dashboard/teacher/payments')}
                  className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition transform hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">💰</div>
                  <h3 className="font-semibold text-lg mb-1">Payments</h3>
                  <p className="text-sm text-purple-100">Manage student payments</p>
                </button>

                <button
                  onClick={() => router.push('/dashboard/teacher/reports')}
                  className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition transform hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">📈</div>
                  <h3 className="font-semibold text-lg mb-1">Reports</h3>
                  <p className="text-sm text-orange-100">View analytics & reports</p>
                </button>
              </div>
            </div>

            {/* My Classes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">My Classes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => {
                  const classStudents = getClassStudents(cls._id);
                  return (
                    <div key={cls._id} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 hover:shadow-md transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/teacher/classes/details?id=${cls._id}`)}>
                      <h3 className="font-semibold text-gray-900 mb-2">{cls.name}</h3>
                      <p className="text-sm text-gray-600">{classStudents.length} students</p>
                    </div>
                  );
                })}
                {classes.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    No classes yet. Create your first class!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
              <button
                onClick={() => setShowAddClassModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                + Add Class
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const classStudents = getClassStudents(cls._id);
                return (
                  <div key={cls._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/dashboard/teacher/classes/details?id=${cls._id}`)}
                      >
                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition">{cls.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Created {new Date(cls.createdAt || '').toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteClassId(cls._id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete class"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">Students</span>
                        <span className="text-2xl font-bold text-gray-900">{classStudents.length}</span>
                      </div>
                      
                      {classStudents.length > 0 && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {classStudents.slice(0, 5).map((student) => (
                            <div key={student._id} className="text-sm text-gray-600 flex items-center">
                              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                              {student.name}
                            </div>
                          ))}
                          {classStudents.length > 5 && (
                            <p className="text-xs text-gray-500 mt-1">
                              +{classStudents.length - 5} more
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => router.push(`/dashboard/teacher/classes/details?id=${cls._id}`)}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
              <button
                onClick={() => {
                  // generate student id and show modal (readonly)
                  const generated = `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  setNewStudent({ name: '', email: '', classId: '', studentId: generated });
                  setShowAddStudentModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                + Add Student
              </button>
            </div>

            {/* Class Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class</label>
              <select
                value={selectedClass?._id || ''}
                onChange={(e) => {
                  const cls = classes.find(c => c._id === e.target.value);
                  setSelectedClass(cls || null);
                }}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(selectedClass 
                    ? students.filter(s => s.classId === selectedClass._id)
                    : students
                  ).map((student) => {
                    const studentClass = classes.find(c => c._id === student.classId);

                    return (
                      <tr 
                        key={student._id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/dashboard/teacher/students/details?id=${student._id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-green-600 font-semibold text-sm">{student.name.charAt(0)}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 font-mono">{student.studentId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {studentClass && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {studentClass.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteStudentId(student._id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>

            {/* Date and Class Selector Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg p-6">
              <div className="space-y-4">
                {/* Date Picker Card */}
                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Class Selector Card */}
                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Class *</label>
                      <select
                        value={selectedClass?._id || ''}
                        onChange={(e) => {
                          const cls = classes.find(c => c._id === e.target.value);
                          setSelectedClass(cls || null);
                          setAttendanceRecords({});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select a class</option>
                        {classes.map((cls) => (
                          <option key={cls._id} value={cls._id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            {selectedClass && Object.keys(attendanceRecords).length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-sm border border-green-200 p-6">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {Object.values(attendanceRecords).filter(s => s === 'present').length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Present</p>
                  </div>
                  <div className="w-px h-12 bg-gray-300"></div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {Object.values(attendanceRecords).filter(s => s === 'absent').length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Absent</p>
                  </div>
                  <div className="w-px h-12 bg-gray-300"></div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">
                      {Object.values(attendanceRecords).filter(s => s === 'late').length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Late</p>
                  </div>
                </div>
              </div>
            )}

            {/* Students List */}
            {selectedClass ? (
              <>
                <div className="space-y-3">
                  {getClassStudents(selectedClass._id).map((student) => (
                    <div key={student._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-lg">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-500">ID: {student.studentId}</p>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => setAttendanceRecords({ ...attendanceRecords, [student._id]: 'present' })}
                            className={`px-4 py-2 rounded-full font-medium transition-all ${
                              attendanceRecords[student._id] === 'present'
                                ? 'bg-green-600 text-white shadow-lg scale-105'
                                : 'bg-green-50 text-green-600 border-2 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            <span className="inline-flex items-center">
                              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              P
                            </span>
                          </button>
                          <button
                            onClick={() => setAttendanceRecords({ ...attendanceRecords, [student._id]: 'absent' })}
                            className={`px-4 py-2 rounded-full font-medium transition-all ${
                              attendanceRecords[student._id] === 'absent'
                                ? 'bg-red-600 text-white shadow-lg scale-105'
                                : 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <span className="inline-flex items-center">
                              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              A
                            </span>
                          </button>
                          <button
                            onClick={() => setAttendanceRecords({ ...attendanceRecords, [student._id]: 'late' })}
                            className={`px-4 py-2 rounded-full font-medium transition-all ${
                              attendanceRecords[student._id] === 'late'
                                ? 'bg-orange-600 text-white shadow-lg scale-105'
                                : 'bg-orange-50 text-orange-600 border-2 border-orange-200 hover:bg-orange-100'
                            }`}
                          >
                            <span className="inline-flex items-center">
                              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              L
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(attendanceRecords).length > 0 && (
                  <button
                    onClick={handleMarkAttendance}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-lg shadow-lg"
                  >
                    Save Attendance ({Object.keys(attendanceRecords).length} students)
                  </button>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Class</h3>
                <p className="text-gray-600">Please select a class to mark attendance</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Class</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
              <input
                type="text"
                value={newClass.name}
                onChange={(e) => setNewClass({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Mathematics Grade 10"
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddClassModal(false);
                  setNewClass({ name: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID (Auto-generated)</label>
                <input
                  type="text"
                  value={newStudent.studentId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select
                  value={newStudent.classId}
                  onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setNewStudent({ name: '', email: '', classId: '', studentId: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStudent}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {deleteClassId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Delete Class</h3>
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete this class? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteClassId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClass(deleteClassId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {deleteStudentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Delete Student</h3>
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete this student? This will also delete all attendance records. This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteStudentId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(deleteStudentId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
