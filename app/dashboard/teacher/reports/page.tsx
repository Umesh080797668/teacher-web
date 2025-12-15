'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { attendanceApi, studentsApi, classesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Attendance, Student, Class, Teacher } from '@/lib/types';

interface StudentReport {
  studentId: string;
  studentName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

interface ClassReport {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated } = useAuthStore();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'students' | 'monthly'>('summary');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const teacher = user as Teacher;
  const teacherId = teacher?.teacherId;

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, userType, router, selectedMonth, selectedYear]);

  const loadData = async () => {
    if (!teacherId) return;
    
    setIsLoading(true);
    try {
      const [attendanceRes, studentsRes, classesRes] = await Promise.all([
        attendanceApi.getAll({ month: selectedMonth, year: selectedYear, teacherId }),
        studentsApi.getAll(teacherId),
        classesApi.getAll(teacherId),
      ]);

      setAttendance(attendanceRes.data);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate overall summary
  const todayDate = new Date().toDateString();
  const todayAttendance = attendance.filter(a => new Date(a.date).toDateString() === todayDate);
  
  const summary = {
    totalStudents: students.length,
    presentToday: todayAttendance.filter(a => a.status === 'present').length,
    absentToday: todayAttendance.filter(a => a.status === 'absent').length,
    lateToday: todayAttendance.filter(a => a.status === 'late').length,
  };

  // Calculate daily attendance by class
  const dailyByClass: ClassReport[] = classes.map(cls => {
    const classStudents = students.filter(s => s.classId === cls._id);
    const classAttendance = todayAttendance.filter(a => 
      classStudents.some(s => s._id === a.studentId)
    );
    
    const presentCount = classAttendance.filter(a => a.status === 'present').length;
    const absentCount = classAttendance.filter(a => a.status === 'absent').length;
    const lateCount = classAttendance.filter(a => a.status === 'late').length;
    const total = presentCount + absentCount + lateCount;
    const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      classId: cls._id,
      className: cls.name,
      totalStudents: classStudents.length,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate,
    };
  });

  // Calculate student reports
  const studentReports: StudentReport[] = students.map(student => {
    const studentAttendance = attendance.filter(a => a.studentId === student._id);
    const presentCount = studentAttendance.filter(a => a.status === 'present').length;
    const absentCount = studentAttendance.filter(a => a.status === 'absent').length;
    const lateCount = studentAttendance.filter(a => a.status === 'late').length;
    const total = studentAttendance.length;
    const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      studentId: student._id,
      studentName: student.name,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate,
    };
  }).sort((a, b) => b.attendanceRate - a.attendanceRate);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reports</h1>
                <p className="text-sm text-gray-600">View attendance reports and analytics</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'summary', name: 'Attendance Summary', icon: '📊' },
              { id: 'students', name: 'Student Reports', icon: '👨‍🎓' },
              { id: 'monthly', name: 'Monthly Stats', icon: '📅' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Attendance Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Overall Attendance Summary</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{summary.totalStudents}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{summary.presentToday}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absent Today</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{summary.absentToday}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Late Today</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{summary.lateToday}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Attendance by Class */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Attendance by Class</h3>
              <div className="space-y-4">
                {dailyByClass.map((classData) => (
                  <div key={classData.classId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">{classData.className}</h4>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium">
                        {classData.totalStudents} Students
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{classData.presentCount}</p>
                        <p className="text-sm text-gray-600">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{classData.absentCount}</p>
                        <p className="text-sm text-gray-600">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{classData.lateCount}</p>
                        <p className="text-sm text-gray-600">Late</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Attendance Rate</span>
                        <span className={`font-semibold ${
                          classData.attendanceRate >= 75 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {classData.attendanceRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            classData.attendanceRate >= 75 ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${classData.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Student Reports Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Student Reports</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Array.from({ length: 10 }, (_, i) => 2020 + i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {studentReports.map((report) => (
                <div key={report.studentId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{report.studentName}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      report.attendanceRate >= 75 
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {report.attendanceRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-sm font-medium">
                        Present: {report.presentCount}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium">
                        Absent: {report.absentCount}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium">
                        Late: {report.lateCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Stats Tab */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Monthly Statistics by Class</h2>
            </div>

            {dailyByClass.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No monthly statistics available</h3>
              </div>
            ) : (
              <div className="space-y-6">
                {dailyByClass.map((classData) => (
                  <div key={classData.classId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">{classData.className}</h3>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium">
                        {classData.totalStudents} Students
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">{classData.presentCount}</p>
                        <p className="text-sm text-gray-600 mt-2">Present</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-3xl font-bold text-red-600">{classData.absentCount}</p>
                        <p className="text-sm text-gray-600 mt-2">Absent</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">{classData.lateCount}</p>
                        <p className="text-sm text-gray-600 mt-2">Late</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Average Attendance Rate</span>
                        <span className={`font-semibold ${
                          classData.attendanceRate >= 75 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {classData.attendanceRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            classData.attendanceRate >= 75 ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${classData.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
