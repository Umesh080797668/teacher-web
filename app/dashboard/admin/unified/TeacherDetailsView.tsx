'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ActiveTeacherData, Class, Student, Attendance } from '@/lib/types';
import { paymentsApi, studentsApi, classesApi, attendanceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Payment } from '@/lib/types';
import Pagination from '@/lib/Pagination';

interface UnifiedTeacherData extends ActiveTeacherData {
  classes: Class[];
  students: Student[];
  todayAttendance: Attendance[];
  isExpanded: boolean;
}

interface TeacherDetailsViewProps {
  teacher: UnifiedTeacherData;
  onMarkAttendance: (teacherId: string, studentId: string, status: 'present' | 'absent' | 'late') => void;
  onRefresh?: () => void;
}

type TabType = 'students' | 'classes' | 'attendance' | 'payments' | 'reports';

export default function TeacherDetailsView({ teacher, onMarkAttendance, onRefresh }: TeacherDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Student Tab State
  const [studentPage, setStudentPage] = useState(1);
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', studentId: '', classId: '' });

  // Class Tab State
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({ name: '', description: '' });

  // Attendance Tab State
  const [attendancePage, setAttendancePage] = useState(1);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string>('');

  // Reports Tab State
  const [reportTab, setReportTab] = useState<'summary' | 'students' | 'daily' | 'monthly'>('summary');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyAttendance, setDailyAttendance] = useState<Attendance[]>([]);
  const [loadingDailyAttendance, setLoadingDailyAttendance] = useState(false);
  const [dailyPollingInterval, setDailyPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Payment Tab State
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ studentId: '', amount: '', type: 'full', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  // Delete confirmation modals
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const response = await paymentsApi.getAll({ teacherId: teacher.teacher.teacherId });
      setPayments(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadDailyAttendance = useCallback(async (date: Date) => {
    setLoadingDailyAttendance(true);
    try {
      const response = await attendanceApi.getAll({
        teacherId: teacher.teacher.teacherId,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      });
      
      // Filter attendance for the selected date
      const selectedDateStr = date.toDateString();
      const dayAttendance = response.data.filter(a => new Date(a.date).toDateString() === selectedDateStr);
      
      setDailyAttendance(dayAttendance);
    } catch (error) {
      console.error('Error loading daily attendance:', error);
      toast.error('Failed to load daily attendance data');
    } finally {
      setLoadingDailyAttendance(false);
    }
  }, [teacher.teacher.teacherId]);

  // Effect to load initial daily attendance when component mounts or date changes
  useEffect(() => {
    if (reportTab === 'daily') {
      loadDailyAttendance(selectedDate);
    }
  }, [selectedDate, reportTab, loadDailyAttendance]);

  // Effect to start/stop polling when daily tab is active
  useEffect(() => {
    if (reportTab === 'daily') {
      // Start polling every 5 seconds
      const interval = setInterval(() => {
        loadDailyAttendance(selectedDate);
      }, 5000);
      
      setDailyPollingInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      // Stop polling when not on daily tab
      if (dailyPollingInterval) {
        clearInterval(dailyPollingInterval);
        setDailyPollingInterval(null);
      }
    }
    
    return () => {
      if (dailyPollingInterval) {
        clearInterval(dailyPollingInterval);
      }
    };
  }, [reportTab, selectedDate, loadDailyAttendance]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'payments' && payments.length === 0) {
      loadPayments();
    }
  };

  const handleAddStudent = async () => {
    try {
      await studentsApi.create({ ...newStudent, teacherId: teacher.teacher.teacherId } as any);
      toast.success('Student added successfully');
      setShowAddStudentModal(false);
      setNewStudent({ name: '', email: '', studentId: '', classId: '' });
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await studentsApi.delete(studentId);
      toast.success('Student removed successfully');
      setDeleteStudentId(null);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to remove student');
    }
  };

  const handleAddClass = async () => {
    try {
      await classesApi.create({ ...newClass, teacherId: teacher.teacher.teacherId });
      toast.success('Class added successfully');
      setShowAddClassModal(false);
      setNewClass({ name: '', description: '' });
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to add class');
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;
    try {
      await classesApi.update(editingClass._id, { name: editingClass.name });
      toast.success('Class updated successfully');
      setEditingClass(null);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update class');
    }
  };

  const handleRemoveClass = async (classId: string) => {
    try {
      await classesApi.delete(classId);
      toast.success('Class removed successfully');
      setDeleteClassId(null);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to remove class');
    }
  };

  const handleAddPayment = async () => {
    try {
      await paymentsApi.create({ 
        ...newPayment, 
        amount: Number(newPayment.amount),
        type: newPayment.type as 'full' | 'half' | 'free',
        classId: teacher.students.find(s => s._id === newPayment.studentId)?.classId || '' 
      });
      toast.success('Payment added successfully');
      setShowAddPaymentModal(false);
      setNewPayment({ studentId: '', amount: '', type: 'full', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
      loadPayments();
    } catch (error) {
      toast.error('Failed to add payment');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = teacher.todayAttendance || [];
  
  // Calculate today's stats
  const todayLate = todayAttendance.filter(a => a.status === 'late').length;

  // Calculate attendance stats for the selected month
  const monthAttendance = teacher.todayAttendance.filter(att => {
    const attDate = new Date(att.date);
    return attDate.getMonth() + 1 === selectedMonth && attDate.getFullYear() === selectedYear;
  });

  // Student reports
  const studentReports = teacher.students.map(student => {
    const studentAtt = monthAttendance.filter(a => a.studentId === student._id);
    const presentCount = studentAtt.filter(a => a.status === 'present').length;
    const absentCount = studentAtt.filter(a => a.status === 'absent').length;
    const lateCount = studentAtt.filter(a => a.status === 'late').length;
    const total = studentAtt.length;
    const rate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      ...student,
      presentCount,
      absentCount,
      lateCount,
      total,
      rate
    };
  }).sort((a, b) => b.rate - a.rate);

  // Class reports
  const classReports = teacher.classes.map(cls => {
    const classStudents = teacher.students.filter(s => s.classId === cls._id);
    const classAttendance = todayAttendance.filter(a => 
      classStudents.some(s => s._id === a.studentId)
    );
    
    const presentCount = classAttendance.filter(a => a.status === 'present').length;
    const absentCount = classAttendance.filter(a => a.status === 'absent').length;
    const lateCount = classAttendance.filter(a => a.status === 'late').length;
    const total = presentCount + absentCount + lateCount;
    const rate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      ...cls,
      totalStudents: classStudents.length,
      presentCount,
      absentCount,
      lateCount,
      rate
    };
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex overflow-x-auto">
          {[
            { id: 'students' as TabType, label: 'Students', icon: '👥' },
            { id: 'classes' as TabType, label: 'Classes', icon: '📚' },
            { id: 'attendance' as TabType, label: 'Attendance', icon: '📅' },
            { id: 'payments' as TabType, label: 'Payments', icon: '💰' },
            { id: 'reports' as TabType, label: 'Reports', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                All Students ({teacher.students.length})
              </h3>
              <div className="flex space-x-2">
                <select
                  value={filterClassId}
                  onChange={(e) => {
                    setFilterClassId(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                >
                  <option value="all">All Classes</option>
                  {teacher.classes.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  + Add Student
                </button>
              </div>
            </div>
            
            {teacher.students.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No students found
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {teacher.students
                    .filter(s => filterClassId === 'all' || s.classId === filterClassId)
                    .sort((a, b) => {
                      const aAtt = todayAttendance.find(att => att.studentId === a._id);
                      const bAtt = todayAttendance.find(att => att.studentId === b._id);
                      // Unmarked first
                      if (!aAtt && bAtt) return -1;
                      if (aAtt && !bAtt) return 1;
                      return 0;
                    })
                    .slice((studentPage - 1) * ITEMS_PER_PAGE, studentPage * ITEMS_PER_PAGE)
                    .map(student => {
                      const studentClass = teacher.classes.find(c => c._id === student.classId);
                      const todayAtt = todayAttendance.find(a => a.studentId === student._id);
                      
                      return (
                        <div key={student._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <span className="text-lg">👤</span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">{student.name}</h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {student.email || 'No email'} • ID: {student.studentId}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {studentClass && (
                                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full">
                                  {studentClass.name}
                                </span>
                              )}
                              
                              {todayAtt ? (
                                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                  todayAtt.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                  todayAtt.status === 'absent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                }`}>
                                  {todayAtt.status === 'present' ? '✓ Present' :
                                   todayAtt.status === 'absent' ? '✗ Absent' :
                                   '⏰ Late'}
                                </span>
                              ) : (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'present')}
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    title="Mark Present"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'absent')}
                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                    title="Mark Absent"
                                  >
                                    ✗
                                  </button>
                                  <button
                                    onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'late')}
                                    className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                                    title="Mark Late"
                                  >
                                    ⏰
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={() => setDeleteStudentId(student._id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                title="Remove Student"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {/* Pagination */}
                {teacher.students.filter(s => filterClassId === 'all' || s.classId === filterClassId).length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center mt-4">
                    <Pagination
                      currentPage={studentPage}
                      totalItems={teacher.students.filter(s => filterClassId === 'all' || s.classId === filterClassId).length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setStudentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                All Classes ({teacher.classes.length})
              </h3>
              <button
                onClick={() => setShowAddClassModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                + Add Class
              </button>
            </div>
            
            {teacher.classes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No classes found
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {teacher.classes.map(cls => {
                  const classStudents = teacher.students.filter(s => s.classId === cls._id);
                  
                  return (
                    <div key={cls._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{cls.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingClass(cls)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                            title="Edit Class"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteClassId(cls._id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                            title="Remove Class"
                          >
                            �️
                          </button>
                        </div>
                      </div>
                      
                      {classStudents.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex flex-wrap gap-2">
                            {classStudents.slice(0, 3).map(student => (
                              <span key={student._id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                {student.name}
                              </span>
                            ))}
                            {classStudents.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                +{classStudents.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mark Attendance
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString()}
              </div>
            </div>

            {/* Class Selector */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Class *</label>
                    <select
                      value={selectedClassForAttendance}
                      onChange={(e) => {
                        setSelectedClassForAttendance(e.target.value);
                        setAttendancePage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a class</option>
                      {teacher.classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {selectedClassForAttendance ? (
              <>
                {(() => {
                  const classStudents = teacher.students.filter(s => s.classId === selectedClassForAttendance);
                  const classAttendance = todayAttendance.filter(a => classStudents.some(s => s._id === a.studentId));
                  const presentCount = classAttendance.filter(a => a.status === 'present').length;
                  const absentCount = classAttendance.filter(a => a.status === 'absent').length;
                  const lateCount = classAttendance.filter(a => a.status === 'late').length;

                  return (
                    <>
                      {/* Summary Card */}
                      {classAttendance.length > 0 && (
                        <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl shadow-sm border border-green-200 dark:border-green-800 p-6 mb-4">
                          <div className="flex items-center justify-around">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {presentCount}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Present</p>
                            </div>
                            <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                {absentCount}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Absent</p>
                            </div>
                            <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                {lateCount}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Late</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {classStudents
                          .sort((a, b) => {
                            const aAtt = todayAttendance.find(att => att.studentId === a._id);
                            const bAtt = todayAttendance.find(att => att.studentId === b._id);
                            // Unmarked first
                            if (!aAtt && bAtt) return -1;
                            if (aAtt && !bAtt) return 1;
                            return 0;
                          })
                          .slice((attendancePage - 1) * ITEMS_PER_PAGE, attendancePage * ITEMS_PER_PAGE)
                          .map(student => {
                          const todayAtt = todayAttendance.find(a => a.studentId === student._id);
                          
                          return (
                            <div key={student._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                                      {student.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{student.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ID: {student.studentId}</p>
                                  </div>
                                </div>
                                
                                {todayAtt ? (
                                  <span className={`px-4 py-2 text-sm rounded-full font-medium ${
                                    todayAtt.status === 'present' ? 'bg-green-600 text-white shadow-lg' :
                                    todayAtt.status === 'absent' ? 'bg-red-600 text-white shadow-lg' :
                                    'bg-orange-600 text-white shadow-lg'
                                  }`}>
                                    {todayAtt.status === 'present' ? '✓ Present' :
                                     todayAtt.status === 'absent' ? '✗ Absent' :
                                     '⏰ Late'}
                                  </span>
                                ) : (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'present')}
                                      className="px-4 py-2 rounded-full font-medium transition-all bg-green-50 text-green-600 border-2 border-green-200 hover:bg-green-100"
                                    >
                                      <span className="inline-flex items-center">
                                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        P
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'absent')}
                                      className="px-4 py-2 rounded-full font-medium transition-all bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100"
                                    >
                                      <span className="inline-flex items-center">
                                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        A
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'late')}
                                      className="px-4 py-2 rounded-full font-medium transition-all bg-orange-50 text-orange-600 border-2 border-orange-200 hover:bg-orange-100"
                                    >
                                      <span className="inline-flex items-center">
                                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        L
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Pagination */}
                      {classStudents.length > ITEMS_PER_PAGE && (
                        <div className="flex justify-center mt-4">
                          <Pagination
                            currentPage={attendancePage}
                            totalItems={classStudents.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setAttendancePage}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select a class to mark attendance</h3>
                <p className="text-gray-600 dark:text-gray-400">Choose a class from the dropdown above to begin marking attendance</p>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payment Records
              </h3>
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                + Add Payment
              </button>
            </div>
            
            {loadingPayments ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No payment records found
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => {
                  const student = teacher.students.find(s => s._id === payment.studentId);
                  const cls = teacher.classes.find(c => c._id === payment.classId);
                  
                  return (
                    <div key={payment._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">💰</div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {student?.name || 'Unknown Student'}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {cls?.name || 'Unknown Class'} • {new Date(payment.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            LKR {payment.amount.toFixed(2)}
                          </div>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            payment.type === 'full' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            payment.type === 'half' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          }`}>
                            {payment.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Attendance Reports
              </h3>
              <div className="flex space-x-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                >
                  {[2023, 2024, 2025].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'summary', name: 'Summary' },
                  { id: 'students', name: 'Student Reports' },
                  { id: 'daily', name: 'Daily View' },
                  { id: 'monthly', name: 'Monthly Stats' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setReportTab(tab.id as any)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${reportTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'}
                    `}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Summary Tab */}
            {reportTab === 'summary' && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Today's Summary</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teacher.students.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{teacher.stats.todayPresent}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Present Today</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{teacher.stats.todayAbsent}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Absent Today</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayLate}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Late Today</div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily View (Class Reports) */}
            {reportTab === 'daily' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">Daily Attendance View</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadDailyAttendance(selectedDate)}
                      disabled={loadingDailyAttendance}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {loadingDailyAttendance ? '🔄' : '↻'} Refresh
                    </button>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Loading indicator */}
                {loadingDailyAttendance && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading attendance data...</span>
                  </div>
                )}

                {/* Date Info Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Selected Date</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90">Day of Year</p>
                      <h3 className="text-2xl font-bold mt-1">
                        Day {Math.floor((selectedDate.getTime() - new Date(selectedDate.getFullYear(), 0, 0).getTime()) / 86400000)}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Daily Statistics */}
                {(() => {
                  const presentCount = dailyAttendance.filter(a => a.status === 'present').length;
                  const absentCount = dailyAttendance.filter(a => a.status === 'absent').length;
                  const lateCount = dailyAttendance.filter(a => a.status === 'late').length;
                  const totalRecorded = dailyAttendance.length;
                  const attendanceRate = totalRecorded > 0 ? (presentCount / totalRecorded) * 100 : 0;

                  return (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
                              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{teacher.students.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">👥</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Present</p>
                              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{presentCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">✅</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
                              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{absentCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">❌</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Late</p>
                              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{lateCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">⏰</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rate</p>
                              <p className={`text-3xl font-bold mt-2 ${
                                attendanceRate >= 75 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {attendanceRate.toFixed(0)}%
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">📊</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Students List by Class */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Students Attendance</h3>
                        
                        {teacher.classes.map(cls => {
                          const classStudents = teacher.students.filter(s => s.classId === cls._id);
                          
                          return (
                            <div key={cls._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-lg font-semibold text-white">{cls.name}</h4>
                                  <span className="px-3 py-1 bg-white bg-opacity-30 text-gray-800 rounded-full text-sm font-medium border border-white border-opacity-20">
                                    {classStudents.length} Students
                                  </span>
                                </div>
                              </div>
                              
                              <div className="p-6">
                                {classStudents.length === 0 ? (
                                  <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">No students in this class</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {classStudents.map(student => {
                                      const studentAttendance = dailyAttendance.find(a => a.studentId === student._id);
                                      const status = studentAttendance?.status || 'not-recorded';
                                      
                                      let statusColor = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
                                      let statusIcon = '❓';
                                      let statusText = 'Not Recorded';
                                      
                                      if (status === 'present') {
                                        statusColor = 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
                                        statusIcon = '✅';
                                        statusText = 'Present';
                                      } else if (status === 'absent') {
                                        statusColor = 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
                                        statusIcon = '❌';
                                        statusText = 'Absent';
                                      } else if (status === 'late') {
                                        statusColor = 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
                                        statusIcon = '⏰';
                                        statusText = 'Late';
                                      }
                                      
                                      return (
                                        <div 
                                          key={student._id}
                                          className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${statusColor}`}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="font-semibold text-sm truncate flex-1">{student.name}</p>
                                            <span className="text-2xl ml-2">{statusIcon}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs opacity-75">ID: {student.studentId}</p>
                                            <span className="text-xs font-medium">{statusText}</span>
                                          </div>
                                          {studentAttendance?.session && (
                                            <p className="text-xs opacity-75 mt-1">Session: {studentAttendance.session}</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {teacher.classes.length === 0 && (
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-3xl">📚</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No classes found</h3>
                            <p className="text-gray-600 dark:text-gray-400">Create a class to start tracking attendance</p>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Student Reports */}
            {reportTab === 'students' && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Student Attendance ({monthNames[selectedMonth - 1]} {selectedYear})
                </h4>
                <div className="space-y-2">
                  {studentReports.map(student => (
                    <div key={student._id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white text-sm">{student.name}</h5>
                          <div className="flex space-x-4 mt-1">
                            <span className="text-xs text-green-600 dark:text-green-400">✓ {student.presentCount}</span>
                            <span className="text-xs text-red-600 dark:text-red-400">✗ {student.absentCount}</span>
                            <span className="text-xs text-orange-600 dark:text-orange-400">⏰ {student.lateCount}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            student.rate >= 80 ? 'text-green-600 dark:text-green-400' :
                            student.rate >= 60 ? 'text-orange-600 dark:text-orange-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {student.rate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {student.total} day{student.total !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Monthly Stats */}
            {reportTab === 'monthly' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Statistics by Class</h4>
                </div>

                {classReports.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📊</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No monthly statistics available</h3>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {classReports.map((classData) => (
                      <div key={classData._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{classData.name}</h3>
                          <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                            {classData.totalStudents} Students
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{classData.presentCount}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Present</p>
                          </div>
                          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{classData.absentCount}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Absent</p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{classData.lateCount}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Late</p>
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Average Attendance Rate</span>
                            <span className={`font-semibold ${
                              classData.rate >= 75 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                            }`}>
                              {classData.rate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                classData.rate >= 75 ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${classData.rate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Student</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={newStudent.studentId}
                    onChange={e => setNewStudent({ ...newStudent, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                  <select
                    value={newStudent.classId}
                    onChange={e => setNewStudent({ ...newStudent, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Class</option>
                    {teacher.classes.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddClassModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Class</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Name</label>
                  <input
                    type="text"
                    value={newClass.name}
                    onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddClassModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddClass}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add Class
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Class</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Name</label>
                  <input
                    type="text"
                    value={editingClass.name}
                    onChange={e => setEditingClass({ ...editingClass, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditingClass(null)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateClass}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Update Class
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Payment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student</label>
                  <select
                    value={newPayment.studentId}
                    onChange={e => setNewPayment({ ...newPayment, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Student</option>
                    {teacher.students.map(student => (
                      <option key={student._id} value={student._id}>{student.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={newPayment.type}
                    onChange={e => setNewPayment({ ...newPayment, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="full">Full</option>
                    <option value="half">Half</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddPaymentModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Student Confirmation Modal */}
        {deleteStudentId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Remove Student</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                Are you sure you want to remove this student? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteStudentId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveStudent(deleteStudentId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Class Confirmation Modal */}
        {deleteClassId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Remove Class</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                Are you sure you want to remove this class? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteClassId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveClass(deleteClassId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
