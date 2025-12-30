import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';
import Class from '@/lib/models/Class';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Get class info
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get students in the class
    const students = await Student.find({ classId });

    // Get attendance for the month/year for these students
    const studentIds = students.map(s => s._id.toString());
    const attendanceRecords = await Attendance.find({
      studentId: { $in: studentIds },
      month,
      year
    });

    // Group attendance by student
    const attendanceByStudent = attendanceRecords.reduce((acc, record) => {
      if (!acc[record.studentId]) {
        acc[record.studentId] = [];
      }
      acc[record.studentId].push({
        date: record.date,
        session: record.session,
        status: record.status
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Combine with student info
    const details = students.map(student => ({
      studentId: student.studentId,
      name: student.name,
      attendance: attendanceByStudent[student._id.toString()] || []
    }));

    return NextResponse.json({
      class: classInfo,
      students: details
    });
  } catch (error) {
    console.error('Error fetching class student details:', error);
    return NextResponse.json({ error: 'Failed to fetch class student details' }, { status: 500 });
  }
}