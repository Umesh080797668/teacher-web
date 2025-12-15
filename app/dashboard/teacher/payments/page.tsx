'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { paymentsApi, studentsApi, classesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Payment, Student, Class, Teacher } from '@/lib/types';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    amount: '',
    type: 'full' as 'full' | 'half' | 'free',
    month: new Date().getMonth() + 1,
  });

  const teacher = user as Teacher;
  const teacherId = teacher?.teacherId;

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

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
      const [paymentsRes, studentsRes, classesRes] = await Promise.all([
        paymentsApi.getAll({ teacherId }),
        studentsApi.getAll(teacherId),
        classesApi.getAll(teacherId),
      ]);

      setPayments(paymentsRes.data);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultAmount = (type: string) => {
    switch (type) {
      case 'full': return '5000';
      case 'half': return '2500';
      case 'free': return '0';
      default: return '0';
    }
  };

  const handleAddPayment = async () => {
    if (!formData.studentId || !formData.classId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      await paymentsApi.create({
        studentId: formData.studentId,
        classId: formData.classId,
        amount,
        type: formData.type,
      });

      toast.success(`Payment recorded successfully (LKR ${amount.toFixed(2)})`);
      setShowForm(false);
      setFormData({
        studentId: '',
        classId: '',
        amount: '',
        type: 'full',
        month: new Date().getMonth() + 1,
      });
      loadData();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await paymentsApi.delete(paymentId);
      toast.success('Payment deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error(error.response?.data?.error || 'Failed to delete payment');
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-blue-500';
      case 'half': return 'bg-orange-500';
      case 'free': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'full': return '💰';
      case 'half': return '💵';
      case 'free': return '🎁';
      default: return '💳';
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'full': return 'Full Payment';
      case 'half': return 'Half Payment';
      case 'free': return 'Free';
      default: return type;
    }
  };

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const fullPayments = payments.filter(p => p.type === 'full').length;
  const halfPayments = payments.filter(p => p.type === 'half').length;
  const freePayments = payments.filter(p => p.type === 'free').length;

  const classStudents = students.filter(s => s.classId === formData.classId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
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
                <h1 className="text-xl font-bold text-gray-900">Payments</h1>
                <p className="text-sm text-gray-600">Manage student payments</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-90 text-sm mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">LKR {totalRevenue.toFixed(0)}</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-90 text-sm mb-2">Total Payments</p>
                  <p className="text-3xl font-bold text-white">{payments.length}</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-500 bg-opacity-30 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{fullPayments}</p>
              <p className="text-white text-opacity-90 text-sm">Full</p>
            </div>
            <div className="bg-orange-500 bg-opacity-30 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{halfPayments}</p>
              <p className="text-white text-opacity-90 text-sm">Half</p>
            </div>
            <div className="bg-purple-500 bg-opacity-30 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{freePayments}</p>
              <p className="text-white text-opacity-90 text-sm">Free</p>
            </div>
          </div>
        </div>

        {/* Add Payment Button / Form */}
        <div className="mb-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-lg shadow-lg"
            >
              + Record New Payment
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Class *</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value, studentId: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Student *</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    disabled={!formData.classId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select a student</option>
                    {classStudents.map((student) => (
                      <option key={student._id} value={student._id}>{student.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Month *</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = e.target.value as 'full' | 'half' | 'free';
                      setFormData({ ...formData, type, amount: getDefaultAmount(type) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="full">Full Payment</option>
                    <option value="half">Half Payment</option>
                    <option value="free">Free</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (LKR) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter payment amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleAddPayment}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Record Payment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments yet</h3>
              <p className="text-gray-600 mb-6">Record your first payment</p>
            </div>
          ) : (
            payments.map((payment) => {
              const student = students.find(s => s._id === payment.studentId);
              const cls = classes.find(c => c._id === payment.classId);

              return (
                <div key={payment._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 ${getPaymentTypeColor(payment.type)} rounded-xl flex items-center justify-center`}>
                        <span className="text-2xl">{getPaymentTypeIcon(payment.type)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{student?.name || 'Unknown Student'}</h3>
                        <p className="text-sm text-gray-600">
                          {cls?.name || 'Unknown Class'} • {getPaymentTypeLabel(payment.type)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(payment.createdAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">LKR {payment.amount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this payment record?')) {
                            handleDeletePayment(payment._id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
