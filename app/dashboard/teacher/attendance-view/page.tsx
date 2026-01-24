'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { attendanceApi, studentsApi, classesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Attendance, Student, Teacher, Class } from '@/lib/types';

export default function AttendanceViewPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated } = useAuthStore();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchText, setSearchText] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(false);

  const teacher = user as Teacher;
  const teacherId = teacher?.teacherId;

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, userType, router, selectedMonth, selectedYear, selectedDate, activeTab]);

  const loadData = async () => {
    if (!teacherId) return;
    
    setIsLoading(true);
    try {
      const [attendanceRes, studentsRes, classesRes] = await Promise.all([
        attendanceApi.getAll({ 
          month: activeTab === 'monthly' ? selectedMonth : undefined, 
          year: activeTab === 'monthly' ? selectedYear : undefined, 
          teacherId 
        }),
        studentsApi.getAll(teacherId),
        classesApi.getAll(teacherId),
      ]);

      setAttendance(attendanceRes.data);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading attendance records...</p>
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
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">View Attendance</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">View attendance records</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('daily')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'daily'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                📅 Daily View
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'monthly'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                📊 Monthly Stats
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'daily' && (
          <DailyViewTab
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            searchText={searchText}
            setSearchText={setSearchText}
            attendance={attendance}
            students={students}
            classes={classes}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyStatsTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showAllMonths={showAllMonths}
            setShowAllMonths={setShowAllMonths}
            attendance={attendance}
            students={students}
            classes={classes}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}

// Daily View Tab Component
function DailyViewTab({
  selectedDate,
  setSelectedDate,
  searchText,
  setSearchText,
  attendance,
  students,
  classes,
  isLoading,
}: {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  attendance: Attendance[];
  students: Student[];
  classes: Class[];
  isLoading: boolean;
}) {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Filter attendance for selected date
  const dailyAttendance = attendance.filter(record =>
    new Date(record.date).toDateString() === new Date(selectedDate).toDateString()
  );

  // Group by class
  const classGroups = dailyAttendance.reduce((acc, record) => {
    const student = students.find(s => s._id === record.studentId);
    const classInfo = classes.find(c => c._id === student?.classId);
    const className = classInfo?.name || 'Unknown Class';

    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push({ record, student });
    return acc;
  }, {} as Record<string, Array<{ record: Attendance; student: Student | undefined }>>);

  // Calculate daily stats
  const dailyStats = {
    present: dailyAttendance.filter(r => r.status === 'present').length,
    absent: dailyAttendance.filter(r => r.status === 'absent').length,
    late: dailyAttendance.filter(r => r.status === 'late').length,
  };

  const totalDaily = dailyStats.present + dailyStats.absent + dailyStats.late;

  const toggleClassExpansion = (className: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(className)) {
      newExpanded.delete(className);
    } else {
      newExpanded.add(className);
    }
    setExpandedClasses(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return '✓';
      case 'absent': return '✗';
      case 'late': return '⏰';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'absent': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'late': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Date Picker and Search */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Date</label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Students</label>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Present</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{dailyStats.present}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{dailyStats.absent}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Late</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{dailyStats.late}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Class-wise Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Class-wise Attendance - {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h3>

        {Object.keys(classGroups).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No attendance records</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No records found for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(classGroups).map(([className, records]) => {
              const filteredRecords = records.filter(({ student }) =>
                !searchText ||
                student?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                student?.studentId?.toLowerCase().includes(searchText.toLowerCase())
              );

              if (filteredRecords.length === 0) return null;

              const classStats = {
                present: filteredRecords.filter(({ record }) => record.status === 'present').length,
                absent: filteredRecords.filter(({ record }) => record.status === 'absent').length,
                late: filteredRecords.filter(({ record }) => record.status === 'late').length,
              };

              return (
                <div key={className} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    onClick={() => toggleClassExpansion(className)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{className}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({filteredRecords.length} students)
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-green-600 dark:text-green-400">{classStats.present}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span className="text-red-600 dark:text-red-400">{classStats.absent}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          <span className="text-orange-600 dark:text-orange-400">{classStats.late}</span>
                        </span>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedClasses.has(className) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedClasses.has(className) && (
                    <div className="px-4 pb-4 space-y-2">
                      {filteredRecords.map(({ record, student }) => (
                        <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(record.status)}`}>
                              <span className="text-sm font-semibold">{getStatusIcon(record.status)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{student?.name || 'Unknown Student'}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">ID: {student?.studentId || 'N/A'}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                            {record.status.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Monthly Stats Tab Component
function MonthlyStatsTab({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  showAllMonths,
  setShowAllMonths,
  attendance,
  students,
  classes,
  isLoading
}: {
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  showAllMonths: boolean;
  setShowAllMonths: (show: boolean) => void;
  attendance: Attendance[];
  students: Student[];
  classes: Class[];
  isLoading: boolean;
}) {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter attendance for selected month/year
  const monthlyAttendance = attendance.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getMonth() + 1 === selectedMonth && recordDate.getFullYear() === selectedYear;
  });

  // Group by class and calculate monthly stats
  const classMonthlyStats = monthlyAttendance.reduce((acc, record) => {
    const student = students.find(s => s._id === record.studentId);
    const classInfo = classes.find(c => c._id === student?.classId);
    const className = classInfo?.name || 'Unknown Class';

    if (!acc[className]) {
      acc[className] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        students: new Set<string>(),
        dailyStats: {} as Record<string, { present: number; absent: number; late: number }>
      };
    }

    acc[className].total++;
    acc[className].students.add(record.studentId);

    switch (record.status) {
      case 'present':
        acc[className].present++;
        break;
      case 'absent':
        acc[className].absent++;
        break;
      case 'late':
        acc[className].late++;
        break;
    }

    // Daily stats
    const dateKey = new Date(record.date).toDateString();
    if (!acc[className].dailyStats[dateKey]) {
      acc[className].dailyStats[dateKey] = { present: 0, absent: 0, late: 0 };
    }
    acc[className].dailyStats[dateKey][record.status]++;

    return acc;
  }, {} as Record<string, {
    total: number;
    present: number;
    absent: number;
    late: number;
    students: Set<string>;
    dailyStats: Record<string, { present: number; absent: number; late: number }>;
  }>);

  const toggleClassExpansion = (className: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(className)) {
      newExpanded.delete(className);
    } else {
      newExpanded.add(className);
    }
    setExpandedClasses(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Month/Year Selector and Show All Toggle */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Array.from({ length: 10 }, (_, i) => 2020 + i).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showAllMonths}
                  onChange={(e) => setShowAllMonths(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Show All Classes</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Class Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Statistics - {monthNames[selectedMonth - 1]} {selectedYear}
        </h3>

        {Object.keys(classMonthlyStats).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No attendance records</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No records found for {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(classMonthlyStats)
              .filter(([className, stats]) => showAllMonths || stats.total > 0)
              .map(([className, stats]) => {
                const attendanceRate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0.0';

                return (
                  <div key={className} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <button
                      onClick={() => toggleClassExpansion(className)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">{className}</span>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {stats.students.size} students • {stats.total} total records
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <div className="text-green-600 dark:text-green-400 font-semibold">{stats.present}</div>
                            <div className="text-gray-500 dark:text-gray-400">Present</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-600 dark:text-red-400 font-semibold">{stats.absent}</div>
                            <div className="text-gray-500 dark:text-gray-400">Absent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-600 dark:text-orange-400 font-semibold">{stats.late}</div>
                            <div className="text-gray-500 dark:text-gray-400">Late</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-600 dark:text-blue-400 font-semibold">{attendanceRate}%</div>
                            <div className="text-gray-500 dark:text-gray-400">Rate</div>
                          </div>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          expandedClasses.has(className) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedClasses.has(className) && (
                      <div className="px-4 pb-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Daily Breakdown</h4>
                          <div className="space-y-2">
                            {Object.entries(stats.dailyStats)
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date, dayStats]) => (
                                <div key={date} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <div className="flex items-center space-x-4">
                                    <span className="text-green-600 dark:text-green-400">P: {dayStats.present}</span>
                                    <span className="text-red-600 dark:text-red-400">A: {dayStats.absent}</span>
                                    <span className="text-orange-600 dark:text-orange-400">L: {dayStats.late}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
