'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { classesApi, studentsApi, attendanceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Class, Student, Attendance, Teacher } from '@/lib/types';

function ClassDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('id');
  const { user, userType, isAuthenticated } = useAuthStore();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    studentId: '',
  });

  const teacher = user as Teacher;

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    if (classId) {
      loadClassData();
    }
  }, [isAuthenticated, userType, router, classId]);

  const loadClassData = async () => {
    if (!classId) return;

    setIsLoading(true);
    try {
      const [classRes, studentsRes, attendanceRes] = await Promise.all([
        classesApi.getById(classId),
        studentsApi.getAll(teacher?.teacherId),
        attendanceApi.getAll({ teacherId: teacher?.teacherId }),
      ]);

      setClassData(classRes.data);
      setEditName(classRes.data.name);
      
      // Filter students for this class
      const classStudents = studentsRes.data.filter(s => s.classId === classId);
      setStudents(classStudents);
      setAttendanceRecords(attendanceRes.data);
    } catch (error) {
      console.error('Error loading class data:', error);
      toast.error('Failed to load class data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAttendanceRate = () => {
    if (students.length === 0) return 0;

    let totalRecords = 0;
    let presentCount = 0;

    students.forEach(student => {
      const studentAttendance = attendanceRecords.filter(
        record => record.studentId === student._id
      );
      totalRecords += studentAttendance.length;
      presentCount += studentAttendance.filter(
        record => record.status === 'present'
      ).length;
    });

    return totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
  };

  const handleEditClass = async () => {
    if (!classData || !editName.trim()) {
      toast.error('Please enter a class name');
      return;
    }

    try {
      await classesApi.update(classData._id, { name: editName.trim() });
      toast.success('Class updated successfully');
      setShowEditModal(false);
      loadClassData();
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast.error(error.response?.data?.error || 'Failed to update class');
    }
  };

  const handleDeleteClass = async () => {
    if (!classData) return;

    try {
      await classesApi.delete(classData._id);
      toast.success('Class deleted successfully');
      router.push('/dashboard/teacher');
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error.response?.data?.error || 'Failed to delete class');
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !classId) {
      toast.error('Please enter student name');
      return;
    }

    try {
      // Generate student ID if not provided
      const studentId = newStudent.studentId || `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      await studentsApi.create({
        name: newStudent.name,
        email: newStudent.email || undefined,
        studentId: studentId,
        classId: classId,
      });
      
      toast.success('Student added successfully');
      setShowAddStudentModal(false);
      setNewStudent({ name: '', email: '', studentId: '' });
      loadClassData();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}?`)) return;

    try {
      await studentsApi.delete(studentId);
      toast.success('Student deleted successfully');
      loadClassData();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.response?.data?.error || 'Failed to delete student');
    }
  };

  const getStudentAttendanceRate = (studentId: string) => {
    const studentAttendance = attendanceRecords.filter(
      record => record.studentId === studentId
    );
    
    if (studentAttendance.length === 0) return 0;
    
    const presentCount = studentAttendance.filter(
      record => record.status === 'present'
    ).length;
    
    return (presentCount / studentAttendance.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading class details...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Class not found</p>
        </div>
      </div>
    );
  }

  const attendanceRate = calculateAttendanceRate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard/teacher')}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-600 transition"
              >
                Edit Class
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-slate-700 border border-red-200 dark:border-slate-600 rounded-lg hover:bg-red-100 dark:hover:bg-slate-600 transition"
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{classData.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Created on {new Date(classData.createdAt || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="w-16 h-16 bg-indigo-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-blue-50 dark:bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Students</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{students.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Attendance Rate</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{attendanceRate.toFixed(1)}%</p>
            </div>
            <div className="bg-purple-50 dark:bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Total Records</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{attendanceRecords.length}</p>
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Students in this Class</h2>
            <button
              onClick={() => {
                // pre-generate student id and show modal (readonly)
                const generated = `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                setNewStudent({ name: '', email: '', studentId: generated });
                setShowAddStudentModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>

          {students.length > 0 ? (
            <div className="space-y-3">
              {students.map((student) => {
                const attendanceRate = getStudentAttendanceRate(student._id);
                
                return (
                  <div key={student._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{student.studentId}</p>
                        {student.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Attendance</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${attendanceRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {attendanceRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(student._id, student.name)}
                      className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition"
                      title="Delete student"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-lg font-medium text-gray-900 dark:text-white">No students in this class yet</p>
              <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">Click "Add Student" to add students to this class</p>
            </div>
          )}
        </div>
      </main>

      {/* Edit Class Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Class</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter class name"
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditClass}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border dark:border-slate-700">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-slate-700 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Delete Class</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Are you sure you want to delete "{classData.name}"? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClass}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Student to Class</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Student ID (Auto-generated)
                </label>
                <input
                  type="text"
                  value={newStudent.studentId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-400 font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This ID is generated automatically and cannot be edited</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="student@example.com"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setNewStudent({ name: '', email: '', studentId: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClassDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading class details...</p>
        </div>
      </div>
    }>
      <ClassDetailsContent />
    </Suspense>
  );
}
