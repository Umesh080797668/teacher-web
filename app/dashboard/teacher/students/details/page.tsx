'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { studentsApi, classesApi, attendanceApi, paymentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Student, Class, Attendance, Teacher, Payment } from '@/lib/types';

function StudentDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('id');
  const { user, userType, isAuthenticated } = useAuthStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments'>('attendance');
  const [editData, setEditData] = useState({
    name: '',
    email: '',
  });

  const teacher = user as Teacher;

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    if (studentId) {
      loadStudentData();
    }
  }, [isAuthenticated, userType, router, studentId]);

  const loadStudentData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      const [studentRes, attendanceRes, paymentsRes] = await Promise.all([
        studentsApi.getById(studentId),
        attendanceApi.getAll({ studentId }),
        paymentsApi.getAll({ studentId }).catch(() => ({ data: [] })), // Handle if payments API doesn't exist yet
      ]);

      setStudent(studentRes.data);
      setEditData({
        name: studentRes.data.name,
        email: studentRes.data.email || '',
      });
      setAttendanceRecords(attendanceRes.data);
      setPaymentRecords(paymentsRes.data || []);

      // Load class data if student has a class
      if (studentRes.data.classId) {
        const classRes = await classesApi.getById(studentRes.data.classId);
        setStudentClass(classRes.data);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      toast.error('Failed to load student data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStudent = async () => {
    if (!student || !editData.name.trim()) {
      toast.error('Please enter student name');
      return;
    }

    try {
      await studentsApi.update(student._id, {
        name: editData.name.trim(),
        email: editData.email.trim() || undefined,
      });
      toast.success('Student updated successfully');
      setShowEditModal(false);
      loadStudentData();
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast.error(error.response?.data?.error || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async () => {
    if (!student) return;

    try {
      await studentsApi.delete(student._id);
      toast.success('Student deleted successfully');
      router.push('/dashboard/teacher');
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.response?.data?.error || 'Failed to delete student');
    }
  };

  const calculateAttendanceRate = () => {
    if (attendanceRecords.length === 0) return 0;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    return (presentCount / attendanceRecords.length) * 100;
  };

  const getAttendanceStats = () => {
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    return { present, absent, late, total: attendanceRecords.length };
  };

  const groupAttendanceByMonth = () => {
    const grouped: { [key: string]: Attendance[] } = {};
    
    attendanceRecords.forEach(record => {
      const date = new Date(record.date);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(record);
    });

    return grouped;
  };

  const groupPaymentsByMonth = () => {
    const grouped: { [key: string]: Payment[] } = {};
    
    paymentRecords.forEach(record => {
      const date = new Date(record.date);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(record);
    });

    return grouped;
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'full':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'half':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      case 'free':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Student not found</p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();
  const attendanceRate = calculateAttendanceRate();
  const groupedAttendance = groupAttendanceByMonth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
              >
                Edit Student
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-indigo-600">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{student.name}</h1>
                <div className="space-y-1">
                  <p className="text-gray-600 flex items-center">
                    <span className="font-medium mr-2">Student ID:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{student.studentId}</span>
                  </p>
                  {student.email && (
                    <p className="text-gray-600 flex items-center">
                      <span className="font-medium mr-2">Email:</span>
                      <span>{student.email}</span>
                    </p>
                  )}
                  {studentClass && (
                    <p className="text-gray-600 flex items-center">
                      <span className="font-medium mr-2">Class:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                        {studentClass.name}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Total Records</p>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-600 font-medium">Present</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-900">{stats.present}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-yellow-600 font-medium">Late</p>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-900">{stats.late}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-600 font-medium">Absent</p>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-red-900">{stats.absent}</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Attendance Rate</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    attendanceRate >= 75 ? 'bg-green-500' :
                    attendanceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${attendanceRate}%` }}
                ></div>
              </div>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {attendanceRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Tabs for Attendance and Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'attendance'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📅 Attendance History
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'payments'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💳 Payment History
              </button>
            </nav>
          </div>
        </div>

        {/* Attendance History Tab */}
        {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance History</h2>
          
          {attendanceRecords.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedAttendance).map(([monthYear, records]) => (
                <div key={monthYear}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{monthYear}</h3>
                  <div className="space-y-2">
                    {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                      <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            record.status === 'present' ? 'bg-green-500' :
                            record.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <p className="text-gray-900 font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No attendance records yet</p>
              <p className="text-sm mt-2">Attendance records will appear here once marked</p>
            </div>
          )}
        </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payment History</h2>
          
          {paymentRecords.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupPaymentsByMonth()).map(([monthYear, records]) => {
                const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
                return (
                  <div key={monthYear}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{monthYear}</h3>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                        Total: Rs. {totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                        <div key={record._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentTypeColor(record.type)}`}>
                              {record.type.toUpperCase()}
                            </div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            Rs. {record.amount.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-medium">No payment records yet</p>
              <p className="text-sm mt-2">Payment records will appear here once added</p>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="student@example.com"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStudent}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Delete Student</h3>
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete {student.name}? This will also delete all attendance records. This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
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

export default function StudentDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading student details...</p>
        </div>
      </div>
    }>
      <StudentDetailsContent />
    </Suspense>
  );
}
