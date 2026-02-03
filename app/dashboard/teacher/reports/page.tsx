'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TeacherNavigation from '@/components/TeacherNavigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  Loader2, 
  Users, 
  CreditCard, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Download,
  School,
  Wallet,
  Receipt
} from 'lucide-react';
import { reportsApi, paymentsApi, classesApi } from '@/lib/api';
import type { Payment as APIPayment, Teacher } from '@/lib/types';
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from '@/lib/store';

// Types matching API responses
interface AttendanceSummary {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  totalStudents: number;
  attendanceRate: number;
}

interface MonthlyStat {
  month: number;
  year: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

interface DailyClassStat {
  classId: string;
  className: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  totalStudents: number;
}

interface StudentReportItem {
  studentId: string;
  studentName: string;
  rollNumber: string;
  className: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  totalClasses: number;
  attendanceRate: number;
  status: string;
}

interface Payment {
  _id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  amount: number;
  type: string;
  month: string;
  date: string;
  status: string;
  paymentMethod: string;
}

interface MonthlyEarningsStat {
  classId: string;
  className: string;
  monthlyBreakdown: {
    month: number;
    year: number;
    amount: number;
    paymentCount: number;
  }[];
}

interface ClassItem {
  _id: string;
  name: string;
}

interface GroupedStudentPayment {
  studentId: string;
  studentName: string;
  className: string;
  payments: Payment[];
  totalAmount: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth() + 1 + "");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear() + "");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [tabDataLoaded, setTabDataLoaded] = useState<{[key: string]: boolean}>({
    summary: false,
    students: false,
    payments: false,
    earnings: false
  });
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadMonth, setDownloadMonth] = useState(new Date().getMonth() + 1);
  const [downloadYear, setDownloadYear] = useState(new Date().getFullYear());

  // Data states
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [dailyClassStats, setDailyClassStats] = useState<DailyClassStat[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReportItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]); // Raw payments list
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarningsStat[]>([]);

  // Fetch all data
  useEffect(() => {
    if (user) {
      loadData(activeTab);
    }
  }, [user, activeTab]);

  const loadData = async (tab: string, retryCount = 0) => {
    const maxRetries = 2;
    const baseDelay = 1000; // 1 second

    try {
      setLoading(true);
      setHasError(false);
      // Get teacher ID from local storage or context if available, otherwise API handles auth
      const teacher = user as Teacher;
      // Ensure we have a valid teacherId. 
      // Some parts of the app use 'teacherId' (string), others might use '_id' (ObjectId).
      // The backend expects the custom 'teacherId' string for some queries.
      const teacherId = teacher?.teacherId || teacher?._id;

      if (!teacherId) {
        console.warn('Teacher ID is missing, skipping report fetch');
        setLoading(false);
        return;
      }

      // Fetch helper data (always needed)
      const classesRes = await classesApi.getAll(teacherId);
      const classesData = classesRes.data || [];
      setClasses(classesData);

      // Load data based on active tab
      const promises = [];

      if (tab === 'summary') {
        promises.push(
          reportsApi.getAttendanceSummary({ teacherId }),
          reportsApi.getMonthlyStats({ teacherId, year: parseInt(selectedYear) }),
          reportsApi.getDailyByClass({ teacherId })
        );
      } else if (tab === 'students') {
        promises.push(reportsApi.getStudentReports({ teacherId }));
      } else if (tab === 'payments') {
        promises.push(paymentsApi.getAll({ teacherId }));
      } else if (tab === 'earnings') {
        promises.push(reportsApi.getMonthlyEarningsByClass({ teacherId }));
      }

      const results = await Promise.all(promises);

      // Process data based on tab
      let resultIndex = 0;

      if (tab === 'summary') {
        const [summaryRes, monthlyRes, dailyClassRes] = results;
        
        const rawSummary = summaryRes.data;
        if (rawSummary) {
           setSummary({
             presentCount: rawSummary.presentCount ?? rawSummary.presentToday ?? 0,
             absentCount: rawSummary.absentCount ?? rawSummary.absentToday ?? 0,
             lateCount: rawSummary.lateCount ?? rawSummary.lateToday ?? 0,
             leaveCount: rawSummary.leaveCount ?? 0,
             totalStudents: rawSummary.totalStudents ?? 0,
             attendanceRate: rawSummary.attendanceRate ?? 
               (rawSummary.totalStudents ? 
                 ((rawSummary.presentToday || 0) + (rawSummary.lateToday || 0)) / rawSummary.totalStudents * 100 
                 : 0)
           });
        }

        setMonthlyStats((monthlyRes.data || []).map((s: any) => ({
          ...s,
          attendanceRate: s.attendanceRate ?? s.averageRate ?? 0
        })));

        setDailyClassStats(dailyClassRes.data || []);
        
        setTabDataLoaded(prev => ({ ...prev, summary: true }));
      } else if (tab === 'students') {
        const studentsRes = results[0];
        const studentsData = (studentsRes.data || []) as StudentReportItem[];
        setStudentReports(studentsData);
        setTabDataLoaded(prev => ({ ...prev, students: true }));
      } else if (tab === 'payments') {
        const paymentsRes = results[0];
        
        // If student reports aren't loaded yet, load them first
        let studentMap = new Map();
        if (studentReports.length === 0) {
          try {
            const studentsRes = await reportsApi.getStudentReports({ teacherId });
            const studentsData = (studentsRes.data || []) as StudentReportItem[];
            setStudentReports(studentsData);
            studentMap = new Map(studentsData.map(s => [s.studentId, s.studentName]));
          } catch (error) {
            console.warn('Failed to load student data for payments mapping');
          }
        } else {
          studentMap = new Map(studentReports.map(s => [s.studentId, s.studentName]));
        }
        
        const mappedPayments = (paymentsRes.data || []).map((p: APIPayment) => ({
          _id: p._id,
          studentId: p.studentId,
          studentName: studentMap.get(p.studentId) || 'Unknown Student',
          classId: p.classId,
          className: classesData.find(c => c._id === p.classId)?.name || 'Unknown Class',
          amount: p.amount,
          type: p.type,
          month: p.month?.toString() || '', 
          date: p.date,
          status: 'Completed',
          paymentMethod: 'Cash'
        }));

        setPayments(mappedPayments);
        setTabDataLoaded(prev => ({ ...prev, payments: true }));
      } else if (tab === 'earnings') {
        const earningsRes = results[0];
        setMonthlyEarnings(earningsRes.data || []);
        setTabDataLoaded(prev => ({ ...prev, earnings: true }));
      }

    } catch (error) {
      console.error("Failed to load reports data", error);

      // Type guard for error
      const isAxiosError = (err: unknown): err is { code?: string; message?: string; response?: { status?: number } } => {
        return typeof err === 'object' && err !== null;
      };

      // Retry logic for timeout errors
      if (isAxiosError(error) && (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retrying reports load in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

        setTimeout(() => {
          loadData(tab, retryCount + 1);
        }, delay);
        return; // Don't show error toast on retry
      }

      // Provide specific error messages based on error type
      let errorMessage = "Failed to load reports data. Please try again.";
      if (isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = "Request timed out. The server is taking too long to respond. Please try again.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error occurred. Please contact support if this persists.";
        }
      } else if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your network and try again.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    try {
      // Generate CSV content based on selected month/year
      let csvContent = '';
      const monthName = new Date(0, downloadMonth - 1).toLocaleString('default', { month: 'long' });
      const filename = `Attendance_Report_${monthName}_${downloadYear}.csv`;

      // Header
      csvContent += `Attendance Report - ${monthName} ${downloadYear}\n\n`;

      // Summary section
      if (summary) {
        csvContent += 'Attendance Summary\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Present,${summary.presentCount}\n`;
        csvContent += `Total Absent,${summary.absentCount}\n`;
        csvContent += `Late Arrivals,${summary.lateCount}\n`;
        csvContent += `On Leave,${summary.leaveCount}\n`;
        csvContent += `Total Students,${summary.totalStudents}\n`;
        csvContent += `Attendance Rate,${summary.attendanceRate.toFixed(1)}%\n\n`;
      }

      // Student reports
      if (studentReports.length > 0) {
        csvContent += 'Student Reports\n';
        csvContent += 'Student Name,Roll Number,Class,Present,Absent,Late,Leave,Total Classes,Attendance Rate,Status\n';
        studentReports.forEach(student => {
          csvContent += `${student.studentName},${student.rollNumber},${student.className},${student.presentCount},${student.absentCount},${student.lateCount},${student.leaveCount},${student.totalClasses},${student.attendanceRate.toFixed(1)}%,${student.status}\n`;
        });
        csvContent += '\n';
      }

      // Payments
      if (payments.length > 0) {
        csvContent += 'Payments\n';
        csvContent += 'Student Name,Class,Amount,Type,Date,Status,Payment Method\n';
        payments.forEach(payment => {
          csvContent += `${payment.studentName},${payment.className},${payment.amount},${payment.type},${payment.date},${payment.status},${payment.paymentMethod}\n`;
        });
        csvContent += '\n';
      }

      // Earnings
      if (monthlyEarnings.length > 0) {
        csvContent += 'Monthly Earnings by Class\n';
        csvContent += 'Class,Month,Year,Amount,Payment Count\n';
        monthlyEarnings.forEach(earning => {
          earning.monthlyBreakdown.forEach(month => {
            csvContent += `${earning.className},${month.month},${month.year},${month.amount},${month.paymentCount}\n`;
          });
        });
      }

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Complete",
        description: `Report downloaded as ${filename}`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
    setShowDownloadDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <TeacherNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <TeacherNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Failed to Load Reports
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              There was an error loading the reports data. Please try again.
            </p>
            <button
              onClick={() => {
                setHasError(false);
                loadData(activeTab);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">View attendance reports and earnings</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowDownloadDialog(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Report</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Attendance Summary</TabsTrigger>
          <TabsTrigger value="students">Student Reports</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {tabDataLoaded.summary ? (
            <AttendanceSummaryTab 
              summary={summary}
              monthlyStats={monthlyStats}
              dailyClassStats={dailyClassStats}
              classes={classes}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading attendance summary...</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          {tabDataLoaded.students ? (
            <StudentReportsTab 
              reports={studentReports}
              classes={classes}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading student reports...</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {tabDataLoaded.payments ? (
            <PaymentsTab 
              payments={payments}
              classes={classes}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading payments data...</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          {tabDataLoaded.earnings ? (
            <EarningsTab 
              monthlyEarnings={monthlyEarnings}
              payments={payments} // Pass raw payments for daily view
              classes={classes}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading earnings data...</span>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Download Report Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Monthly Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select month and year for the report:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <Select value={downloadMonth.toString()} onValueChange={(value) => setDownloadMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Select value={downloadYear.toString()} onValueChange={(value) => setDownloadYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownloadReport}>
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}

// --- Tab Components ---

function AttendanceSummaryTab({ 
  summary, 
  monthlyStats, 
  dailyClassStats,
  classes 
}: { 
  summary: AttendanceSummary | null, 
  monthlyStats: MonthlyStat[], 
  dailyClassStats: DailyClassStat[],
  classes: ClassItem[]
}) {
  if (!summary) return <div>No summary data available</div>;

  const chartData = monthlyStats.map(stat => ({
    name: new Date(0, stat.month - 1).toLocaleString('default', { month: 'short' }),
    Present: stat.presentCount,
    Absent: stat.absentCount,
    Late: stat.lateCount
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Total Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{summary.presentCount}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              {summary.attendanceRate.toFixed(1)}% Attendance Rate
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Total Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{summary.absentCount}</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{summary.lateCount}</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">On Leave</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{summary.leaveCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Late" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Today's Overview by Class</CardTitle>
            <CardDescription>
              Attendance breakdown for {format(new Date(), 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyClassStats.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-4">No data for today</p>
              ) : dailyClassStats.map((stat) => (
                <div key={stat.classId} className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="font-medium">{stat.className}</span>
                     <span className="text-sm text-muted-foreground">{stat.attendanceRate.toFixed(0)}%</span>
                   </div>
                   <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${(stat.presentCount / stat.totalStudents) * 100}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${(stat.absentCount / stat.totalStudents) * 100}%` }} />
                      <div className="h-full bg-yellow-500" style={{ width: `${(stat.lateCount / stat.totalStudents) * 100}%` }} />
                   </div>
                   <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"/> {stat.presentCount}</span>
                      <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"/> {stat.absentCount}</span>
                      <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"/> {stat.lateCount}</span>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StudentReportsTab({ reports, classes }: { reports: StudentReportItem[], classes: ClassItem[] }) {
  const [filterClass, setFilterClass] = useState("all");

  const filteredReports = useMemo(() => {
    return reports.filter(r => filterClass === "all" || r.className === classes.find(c => c._id === filterClass)?.name || r.className === filterClass); // loose matching if ids don't align perfectly
  }, [reports, filterClass, classes]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Student Performance Reports</CardTitle>
        <div className="w-[200px]">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Class" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls._id} value={cls._id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Late</TableHead>
              <TableHead className="text-right">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {filteredReports.map((student) => (
               <TableRow key={student.studentId}>
                 <TableCell className="font-medium">
                   <div>{student.studentName}</div>
                   <div className="text-xs text-muted-foreground">{student.rollNumber}</div>
                 </TableCell>
                 <TableCell>{student.className}</TableCell>
                 <TableCell className="text-center">
                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">{student.presentCount}</Badge>
                 </TableCell>
                 <TableCell className="text-center">
                    <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">{student.absentCount}</Badge>
                 </TableCell>
                 <TableCell className="text-center">
                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">{student.lateCount}</Badge>
                 </TableCell>
                 <TableCell className="text-right">
                   <span className={
                     student.attendanceRate >= 75 ? "text-green-600 font-bold" : 
                     student.attendanceRate >= 60 ? "text-yellow-600 font-bold" : "text-red-600 font-bold"
                   }>
                     {student.attendanceRate.toFixed(1)}%
                   </span>
                 </TableCell>
               </TableRow>
             ))}
             {filteredReports.length === 0 && (
               <TableRow>
                 <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                   No student reports found.
                 </TableCell>
               </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentsTab({ payments, classes }: { payments: Payment[], classes: ClassItem[] }) {
  const [filterClass, setFilterClass] = useState("all");
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Group payments by student like the mobile app
  const groupedPayments = useMemo(() => {
    // 1. Filter raw payments
    const filtered = payments.filter(p => {
       const classMatch = filterClass === "all" || p.classId === filterClass;
       // Assuming p.date is ISO or parseable, or p.month matches filter
       // Mobile filters by Date Month/Year components. 
       // `p.month` in API response might be "January" string or number? 
       // Based on schemas usually seen, let's parse date.
       // The API mock/structure suggests `date` is ISO.
       let dateMatch = true;
       if (p.date) {
         const d = new Date(p.date);
         dateMatch = d.getMonth() + 1 === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear);
       }
       return classMatch && dateMatch;
    });

    // 2. Group by Student
    const groups: { [key: string]: GroupedStudentPayment } = {};
    
    filtered.forEach(p => {
      if (!groups[p.studentId]) {
        groups[p.studentId] = {
          studentId: p.studentId,
          studentName: p.studentName,
          className: p.className,
          payments: [],
          totalAmount: 0
        };
      }
      groups[p.studentId].payments.push(p);
      groups[p.studentId].totalAmount += p.amount;
    });

    return Object.values(groups);
  }, [payments, filterClass, filterMonth, filterYear]);


  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
             <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={m.toString()}>{new Date(0, m-1).toLocaleString('default', { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {[0,1,2,3,4].map(i => {
                      const y = new Date().getFullYear() - i;
                      return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Payments List */}
      {groupedPayments.length === 0 ? (
         <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-background text-muted-foreground">
            <CreditCard className="h-12 w-12 mb-4 opacity-20" />
            <p>No payments found for selected criteria.</p>
         </div>
      ) : (
        <Card className="px-2"> {/* Container for accordion */}
          <Accordion type="multiple" className="w-full">
            {groupedPayments.map((group) => (
              <AccordionItem key={group.studentId} value={group.studentId}>
                <AccordionTrigger className="hover:no-underline">
                   <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="text-left">
                         <div className="font-semibold">{group.studentName}</div>
                         <div className="text-xs text-muted-foreground">{group.className}</div>
                      </div>
                      <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                         Rs. {group.totalAmount.toFixed(2)}
                      </Badge>
                   </div>
                </AccordionTrigger>
                <AccordionContent>
                   <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
                      {group.payments.map((p, idx) => (
                        <div key={p._id || idx} className="flex items-center justify-between text-sm py-2 border-b last:border-0 border-dashed">
                           <div className="flex items-center gap-3">
                              {p.type.toLowerCase() === 'full' ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : 
                               p.type.toLowerCase() === 'half' ? <AlertCircle className="w-4 h-4 text-orange-500"/> :
                               <Badge variant="secondary" className="text-[10px] h-4">{p.type}</Badge>
                              }
                              <div className="flex flex-col">
                                <span className="font-medium capitalize">{p.type} Payment</span>
                                <span className="text-xs text-muted-foreground">
                                  {p.date ? format(new Date(p.date), 'dd/MM/yyyy') : 'No date'}
                                </span>
                              </div>
                           </div>
                           <span className="font-bold">Rs. {p.amount.toFixed(2)}</span>
                        </div>
                      ))}
                   </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}
    </div>
  );
}

function EarningsTab({ 
  monthlyEarnings, 
  payments, 
  classes 
}: { 
  monthlyEarnings: MonthlyEarningsStat[], 
  payments: Payment[], 
  classes: ClassItem[] 
}) {
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  
  // -- Monthly View State --
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // -- Daily View State --
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // --- Monthly Calculation ---
  const monthlyData = useMemo(() => {
    // Flatten earnings
    const flattened: any[] = [];
    monthlyEarnings.forEach(cls => {
      cls.monthlyBreakdown.forEach(m => {
        flattened.push({
          classId: cls.classId,
          className: cls.className,
          month: m.month,
          year: m.year,
          amount: m.amount,
          paymentCount: m.paymentCount
        });
      });
    });

    // Filter
    const filtered = flattened.filter(item => 
      item.month === parseInt(filterMonth) && 
      item.year === parseInt(filterYear)
    );

    const totalAmount = filtered.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCount = filtered.reduce((acc, curr) => acc + curr.paymentCount, 0);

    return { items: filtered, totalAmount, totalCount };
  }, [monthlyEarnings, filterMonth, filterYear]);

  // --- Daily Calculation ---
  const dailyData = useMemo(() => {
    if (!selectedDate) return { items: [], totalAmount: 0, totalCount: 0 };
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Filter raw payments for this date
    const dailyPayments = payments.filter(p => {
      if (!p.date) return false;
      return p.date.startsWith(dateStr); // match YYYY-MM-DD
    });

    // Group by Class
    const classMap: {[key: string]: { className: string, amount: number, count: number }} = {};
    let totalAmount = 0;

    dailyPayments.forEach(p => {
       const key = p.className || "Unknown Class";
       if (!classMap[key]) {
         classMap[key] = { className: key, amount: 0, count: 0 };
       }
       classMap[key].amount += p.amount;
       classMap[key].count += 1;
       totalAmount += p.amount;
    });

    return { 
      items: Object.values(classMap), 
      totalAmount, 
      totalCount: dailyPayments.length 
    };
  }, [payments, selectedDate]);


  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex space-x-2">
        <Button 
          variant={viewMode === 'monthly' ? 'default' : 'outline'} 
          onClick={() => setViewMode('monthly')}
          className="flex-1"
        >
          <CalendarIcon className="mr-2 h-4 w-4" /> Monthly View
        </Button>
        <Button 
          variant={viewMode === 'daily' ? 'default' : 'outline'} 
          onClick={() => setViewMode('daily')}
          className="flex-1"
        >
          <Clock className="mr-2 h-4 w-4" /> Daily View
        </Button>
      </div>

      {/* Filters Area */}
      {viewMode === 'monthly' ? (
        <div className="flex gap-4">
           <div className="grid gap-2 flex-1">
              <label className="text-sm font-medium">Month</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={m.toString()}>{new Date(0, m-1).toLocaleString('default', { month: 'long' })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
           <div className="grid gap-2 flex-1">
              <label className="text-sm font-medium">Year</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {[0,1,2,3,4].map(i => {
                    const y = new Date().getFullYear() - i;
                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
           </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Select Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Summary Card */}
      <Card className={`text-white border-0 shadow-lg ${viewMode === 'monthly' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
         <CardContent className="flex flex-col items-center justify-center py-8">
            <h3 className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">
               {viewMode === 'monthly' ? 'Total Earnings' : `Earnings on ${selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Date'}`}
            </h3>
            <div className="text-4xl font-bold mb-1">
               Rs. {(viewMode === 'monthly' ? monthlyData.totalAmount : dailyData.totalAmount).toFixed(2)}
            </div>
            <p className="text-white/80 text-sm">
               {(viewMode === 'monthly' ? monthlyData.totalCount : dailyData.totalCount)} payments
            </p>
         </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
         {(viewMode === 'monthly' ? monthlyData.items : dailyData.items).length === 0 ? (
           <div className="text-center py-10 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No earnings found for this period.</p>
           </div>
         ) : (
           (viewMode === 'monthly' ? monthlyData.items : dailyData.items).map((item, idx) => (
             <Card key={idx} className="overflow-hidden">
                <div className="flex items-center p-4">
                   <div className={`p-3 rounded-xl mr-4 ${viewMode === 'monthly' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {viewMode === 'monthly' ? <School className="w-6 h-6"/> : <Receipt className="w-6 h-6"/>}
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold text-base">{item.className}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.paymentCount || (item as any).count} payments
                        {viewMode === 'monthly' && ` • ${new Date(0, (item as any).month - 1).toLocaleString('default', { month: 'long' })}`}
                      </p>
                   </div>
                   <Badge variant="outline" className={`${viewMode === 'monthly' ? 'text-green-700 bg-green-50' : 'text-blue-700 bg-blue-50'} border-0 text-sm font-bold px-3 py-1`}>
                      Rs. {item.amount.toFixed(2)}
                   </Badge>
                </div>
             </Card>
           ))
         )}
      </div>
    </div>
  );
}
