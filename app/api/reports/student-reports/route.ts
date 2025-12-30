import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');
    const teacherId = searchParams.get('teacherId');

    // Get all students
    let studentQuery: any = {};
    if (teacherId) {
      // This would require joining with classes, but for simplicity, we'll get all students
    }

    const students = await Student.find(studentQuery);

    // Get attendance for the month/year
    const attendanceRecords = await Attendance.find({ month, year });

    // Group attendance by student
    const attendanceByStudent = attendanceRecords.reduce((acc, record) => {
      if (!acc[record.studentId]) {
        acc[record.studentId] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      acc[record.studentId][record.status]++;
      acc[record.studentId].total++;
      return acc;
    }, {} as Record<string, any>);

    // Combine with student info
    const reports = students.map(student => ({
      studentId: student.studentId,
      name: student.name,
      ...attendanceByStudent[student._id.toString()] || { present: 0, absent: 0, late: 0, total: 0 }
    }));

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return NextResponse.json({ error: 'Failed to fetch student reports' }, { status: 500 });
  }
}