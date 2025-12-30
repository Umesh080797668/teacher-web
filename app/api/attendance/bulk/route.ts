import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // Expect an array of attendance records
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be an array of attendance records' }, { status: 400 });
    }

    const attendanceRecords = body.map((record: any) => {
      const { studentId, date, session, status, month, year } = record;
      return {
        studentId,
        date: new Date(date),
        session,
        status,
        month,
        year,
      };
    });

    const insertedRecords = await Attendance.insertMany(attendanceRecords);
    return NextResponse.json(insertedRecords, { status: 201 });
  } catch (error) {
    console.error('Bulk attendance creation error:', error);
    return NextResponse.json({ error: 'Failed to create attendance records' }, { status: 500 });
  }
}