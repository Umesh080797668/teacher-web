'use client';

import { useEffect, useState } from 'react';
import type { Student, Attendance, Payment } from '@/lib/types';
import { attendanceApi, paymentsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface StudentDetailModalProps {
  student: Student;
  onClose: () => void;
}

export default function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments'>('attendance');
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, [student._id]);

  const loadStudentData = async () => {
    setIsLoading(true);
    try {
      const [attendanceRes, paymentsRes] = await Promise.all([
        attendanceApi.getAll({ studentId: student._id }),
        paymentsApi.getAll({ studentId: student._id }).catch(() => ({ data: [] })),
      ]);

      setAttendanceRecords(attendanceRes.data);
      setPaymentRecords(paymentsRes.data || []);
    } catch (error) {
      console.error('Error loading student data:', error);
      toast.error('Failed to load student data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    return { present, absent, late, total: attendanceRecords.length };
  };

  const calculateAttendanceRate = () => {
    if (attendanceRecords.length === 0) return 0;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    return (presentCount / attendanceRecords.length) * 100;
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
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'half':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      case 'free':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const stats = getAttendanceStats();
  const attendanceRate = calculateAttendanceRate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{student.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <p className="text-sm opacity-90">ID: {student.studentId}</p>
                {student.email && <p className="text-sm opacity-90">{student.email}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'attendance'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              📊 Attendance History
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'payments'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              💳 Payment History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Attendance Tab */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Present</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Absent</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.late}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Late</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{attendanceRate.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Rate</p>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Attendance</h3>
                    {attendanceRecords.length > 0 ? (
                      <div className="space-y-2">
                        {attendanceRecords.slice(0, 10).map((record) => (
                          <div key={record._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                record.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                record.status === 'absent' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                              }`}>
                                {record.status.toUpperCase()}
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
                            <p className="text-sm text-gray-600 dark:text-gray-400">{record.session}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">No attendance records yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment History by Month</h3>
                  {paymentRecords.length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(groupPaymentsByMonth()).map(([monthYear, records]) => {
                        const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
                        return (
                          <div key={monthYear}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{monthYear}</h4>
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
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">💳</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">No payment records yet</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
