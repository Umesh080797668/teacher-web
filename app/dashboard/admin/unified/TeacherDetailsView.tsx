'use client';

import { useState } from 'react';
import type { ActiveTeacherData, Class, Student, Attendance } from '@/lib/types';
import { paymentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Payment } from '@/lib/types';

interface UnifiedTeacherData extends ActiveTeacherData {
  classes: Class[];
  students: Student[];
  todayAttendance: Attendance[];
  isExpanded: boolean;
}

interface TeacherDetailsViewProps {
  teacher: UnifiedTeacherData;
  onMarkAttendance: (teacherId: string, studentId: string, status: 'present' | 'absent' | 'late') => void;
}

type TabType = 'students' | 'classes' | 'attendance' | 'payments' | 'reports';

export default function TeacherDetailsView({ teacher, onMarkAttendance }: TeacherDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'payments' && payments.length === 0) {
      loadPayments();
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
            </div>
            
            {teacher.students.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No students found
              </div>
            ) : (
              <div className="grid gap-3">
                {teacher.students.map(student => {
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              All Classes ({teacher.classes.length})
            </h3>
            
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
                        <div className="text-3xl">📚</div>
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
                Today's Attendance
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teacher.students.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{teacher.stats.todayPresent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{teacher.stats.todayAbsent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Absent</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayLate}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Late</div>
              </div>
            </div>

            <div className="space-y-3">
              {teacher.students.map(student => {
                const studentClass = teacher.classes.find(c => c._id === student.classId);
                const todayAtt = todayAttendance.find(a => a.studentId === student._id);
                
                return (
                  <div key={student._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{student.name}</h4>
                          {studentClass && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{studentClass.name}</p>
                          )}
                        </div>
                      </div>
                      
                      {todayAtt ? (
                        <span className={`px-4 py-2 text-sm rounded-lg font-medium ${
                          todayAtt.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          todayAtt.status === 'absent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        }`}>
                          {todayAtt.status === 'present' ? '✓ Present' :
                           todayAtt.status === 'absent' ? '✗ Absent' :
                           '⏰ Late'}
                        </span>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'present')}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                          >
                            ✓ Present
                          </button>
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'absent')}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium"
                          >
                            ✗ Absent
                          </button>
                          <button
                            onClick={() => onMarkAttendance(teacher.teacher.teacherId, student._id, 'late')}
                            className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 font-medium"
                          >
                            ⏰ Late
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Payment Records
            </h3>
            
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

            {/* Today's Summary */}
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

            {/* Class Reports */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Today's Attendance by Class</h4>
              <div className="space-y-3">
                {classReports.map(cls => (
                  <div key={cls._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">{cls.name}</h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {cls.totalStudents} student{cls.totalStudents !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {cls.rate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">{cls.presentCount}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">{cls.absentCount}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{cls.lateCount}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Late</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Reports */}
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
          </div>
        )}
      </div>
    </div>
  );
}
