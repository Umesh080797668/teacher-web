import type { Teacher, Class, Student, Attendance, ActiveTeacherData } from '@/lib/types';

export interface UnifiedTeacherData extends ActiveTeacherData {
  classes: Class[];
  students: Student[];
  todayAttendance: Attendance[];
  isExpanded: boolean;
}
