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
import type { Payment as APIPayment } from '@/lib/types';
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth() + 1 + "");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear() + "");
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Data states
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [dailyClassStats, setDailyClassStats] = useState<DailyClassStat[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReportItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]); // Raw payments list
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarningsStat[]>([]);

  // Fetch all data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get teacher ID from local storage or context if available, otherwise API handles auth
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const teacherId = user?.id;

      // Fetch helper data
      const classesRes = await classesApi.getAll();
      const classesData = classesRes.data || [];
      setClasses(classesData);

      // Parallel fetch for report tabs
      const [
        summaryRes,
        monthlyRes,
        dailyClassRes,
        studentsRes,
        paymentsRes, // Fetch raw payments for filtering
        earningsRes
      ] = await Promise.all([
        reportsApi.getAttendanceSummary({ teacherId }),
        reportsApi.getMonthlyStats({ teacherId, year: parseInt(selectedYear) }),
        reportsApi.getDailyByClass({ teacherId }), // Defaults to today
        reportsApi.getStudentReports({ teacherId }),
        paymentsApi.getAll({ teacherId }), 
        reportsApi.getMonthlyEarningsByClass({ teacherId })
      ]);

      setSummary(summaryRes.data);
      setMonthlyStats(monthlyRes.data || []);
      setDailyClassStats(dailyClassRes.data || []);
      const studentsData = (studentsRes.data || []) as StudentReportItem[];
      setStudentReports(studentsData);
      
      // Map API payments to UI model
      const classMap = new Map(classesData.map(c => [c._id, c.name]));
      const studentMap = new Map(studentsData.map(s => [s.studentId, s.studentName]));
      
      const mappedPayments = (paymentsRes.data || []).map((p: APIPayment) => ({
        _id: p._id,
        studentId: p.studentId,
        studentName: studentMap.get(p.studentId) || 'Unknown Student',
        classId: p.classId,
        className: classMap.get(p.classId) || 'Unknown Class',
        amount: p.amount,
        type: p.type,
        month: p.month?.toString() || '', 
        date: p.date,
        status: 'Completed',
        paymentMethod: 'Cash'
      }));

      setPayments(mappedPayments);
      setMonthlyEarnings(earningsRes.data || []);

    } catch (error) {
      console.error("Failed to load reports data", error);
      toast({
        title: "Error",
        description: "Failed to load reports data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNavigation />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Attendance Summary</TabsTrigger>
          <TabsTrigger value="students">Student Reports</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <AttendanceSummaryTab 
            summary={summary}
            monthlyStats={monthlyStats}
            dailyClassStats={dailyClassStats}
            classes={classes}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
           <StudentReportsTab 
             reports={studentReports}
             classes={classes}
           />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentsTab 
            payments={payments}
            classes={classes}
          />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <EarningsTab 
            monthlyEarnings={monthlyEarnings}
            payments={payments} // Pass raw payments for daily view
            classes={classes}
          />
        </TabsContent>
      </Tabs>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.presentCount}</div>
            <p className="text-xs text-muted-foreground">
              {summary.attendanceRate.toFixed(1)}% Attendance Rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.absentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.lateCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.leaveCount}</div>
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
            <SelectContent>
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
                  <SelectContent>
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
                  <SelectContent>
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
                  <SelectContent>
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
                <SelectContent>
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
                <SelectContent>
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
