'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherNavigation from '@/components/TeacherNavigation';
import { useAuthStore } from '@/lib/store';
import { paymentsApi, studentsApi, classesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Payment, Student, Class, Teacher } from '@/lib/types';
import Pagination from '@/lib/Pagination';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Filter States (View Mode)
  const currentYear = new Date().getFullYear();
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(currentYear);

  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    amount: '',
    type: 'full' as 'full' | 'half' | 'free',
    month: new Date().getMonth() + 1,
    year: currentYear,
    recordingDate: new Date().toISOString().split('T')[0],
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const PAYMENTS_PER_PAGE = 10;

  // Delete modal state
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, userType, router]);

  const loadData = async (silent = false) => {
    if (!teacherId) return;
    
    if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
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
    if ((isNaN(amount) || amount <= 0) && formData.type !== 'free') {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      await paymentsApi.create({
        studentId: formData.studentId,
        classId: formData.classId,
        amount,
        type: formData.type,
        month: formData.month,
        year: formData.year,
        recordingDate: formData.recordingDate
      });

      toast.success(`Payment recorded successfully (LKR ${amount.toFixed(2)})`);
      setShowForm(false);
      // Reset form but keep logical defaults
      setFormData({
        studentId: '',
        classId: '',
        amount: '',
        type: 'full',
        month: new Date().getMonth() + 1,
        year: currentYear,
        recordingDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      // Close modal immediately and locally remove item for responsiveness
      setDeletePaymentId(null);
      
      // Optimistic update
      setPayments(prev => prev.filter(p => p._id !== paymentId));

      await paymentsApi.delete(paymentId);
      toast.success('Payment deleted successfully');
      
      // Silent refresh to ensure sync
      loadData(true);
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error(error.response?.data?.error || 'Failed to delete payment');
      // Revert optimistic update (reload data) if failed
      loadData(true);
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'half': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'free': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
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

  // Filter Logic matching Mobile App
  const filteredPayments = payments.filter(payment => {
      const pMonth = payment.month || (payment.date ? new Date(payment.date).getMonth() + 1 : 0);
      const pYear = payment.year || (payment.date ? new Date(payment.date).getFullYear() : 0);
      // If month/year are missing from payment record (old data), try falling back to createdAt
      const finalMonth = pMonth || (payment.createdAt ? new Date(payment.createdAt).getMonth() + 1 : 0);
      const finalYear = pYear || (payment.createdAt ? new Date(payment.createdAt).getFullYear() : 0);
      
      return finalMonth === viewMonth && finalYear === viewYear;
  });

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const fullPayments = filteredPayments.filter(p => p.type === 'full').length;
  const halfPayments = filteredPayments.filter(p => p.type === 'half').length;
  const freePayments = filteredPayments.filter(p => p.type === 'free').length;

  const classStudents = students.filter(s => s.classId === formData.classId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <TeacherNavigation activeTab="payments" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* View Filter */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          </div>
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
             <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="px-3 py-1.5 border-none bg-transparent font-medium text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 border-none bg-transparent font-medium text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
          </div>
        </div>

        {/* Stats Cards - Updated UI for better visibility */}
        <div className="bg-indigo-600 dark:bg-indigo-900 rounded-3xl shadow-xl p-6 mb-8 text-white relative overflow-hidden">
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black opacity-10 rounded-full blur-2xl"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1 text-indigo-100">Total Revenue</p>
                  <p className="text-3xl font-bold tracking-tight">LKR {totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1 text-indigo-100">Total Payments</p>
                  <p className="text-3xl font-bold tracking-tight">{filteredPayments.length}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 relative z-10">
            <div className="bg-blue-500/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{fullPayments}</p>
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mt-1">Full</p>
            </div>
            <div className="bg-orange-500/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{halfPayments}</p>
              <p className="text-orange-100 text-xs font-semibold uppercase tracking-wider mt-1">Half</p>
            </div>
            <div className="bg-purple-500/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{freePayments}</p>
              <p className="text-purple-100 text-xs font-semibold uppercase tracking-wider mt-1">Free</p>
            </div>
          </div>
        </div>

        {/* Add Payment Button / Form */}
        <div className="mb-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition font-medium text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">+</span> Record New Payment
            </button>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Class *</label>
                    <select
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value, studentId: '' })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all"
                    >
                      <option value="">Select a class</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Student *</label>
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      disabled={!formData.classId}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all"
                    >
                      <option value="">Select a student</option>
                      {classStudents.map((student) => (
                        <option key={student._id} value={student._id}>{student.name}</option>
                      ))}
                    </select>
                  </div>
                  
                   <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const type = e.target.value as 'full' | 'half' | 'free';
                        setFormData({ ...formData, type, amount: getDefaultAmount(type) });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all"
                    >
                      <option value="full">Full Payment</option>
                      <option value="half">Half Payment</option>
                      <option value="free">Free</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">For Month</label>
                        <select
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all"
                        >
                        {months.map((month) => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">For Year</label>
                        <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all"
                        >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                  </div>

                   <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recording Date</label>
                    <input
                      type="date"
                      value={formData.recordingDate}
                      onChange={(e) => setFormData({ ...formData, recordingDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (LKR) *</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">LKR</span>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="Amount"
                            className="w-full pl-14 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-bold text-lg"
                        />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                 <button
                    onClick={() => setShowForm(false)}
                    className="mr-4 px-6 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-md hover:shadow-lg transform active:scale-95"
                  >
                    Record Payment
                  </button>
              </div>

            </div>
          )}
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payment History - {months.find(m => m.value === viewMonth)?.label} {viewYear}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-slate-700">
                {filteredPayments.length} Records
            </span>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500 dark:text-indigo-400">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payments found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">No payments recorded for this period.</p>
              <button onClick={() => setShowForm(true)} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                 Record a payment now
              </button>
            </div>
          ) : (
            <>
              {filteredPayments
                .slice((currentPage - 1) * PAYMENTS_PER_PAGE, currentPage * PAYMENTS_PER_PAGE)
                .map((payment) => {
                const student = students.find(s => s._id === payment.studentId);
                const cls = classes.find(c => c._id === payment.classId);

                return (
                  <div key={payment._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${getPaymentTypeColor(payment.type)} rounded-full flex items-center justify-center`}>
                          <span className="text-xl">{getPaymentTypeIcon(payment.type)}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{student?.name || 'Unknown Student'}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {cls?.name || 'Class'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(payment.recordingDate || payment.date || payment.createdAt || '').toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">LKR {payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{getPaymentTypeLabel(payment.type)}</p>
                        </div>
                        <button
                          onClick={() => setDeletePaymentId(payment._id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Delete Payment"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPayments.length}
                itemsPerPage={PAYMENTS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </main>

      {/* Delete Payment Modal */}
      {deletePaymentId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border dark:border-slate-700 transform transition-all scale-100">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Delete Payment?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center text-sm">
              This action cannot be undone. The payment record will be permanently removed.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeletePaymentId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deletePaymentId) {
                    handleDeletePayment(deletePaymentId);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition shadow-lg shadow-red-600/30"
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
