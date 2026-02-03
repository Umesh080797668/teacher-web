import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const teacherId = searchParams.get('teacherId');

    // Build query
    let query: any = {};
    let studentIdsFilter: string[] | null = null;

    if (studentId) {
      query.studentId = studentId;
    }

    if (classId) {
      // Get all students in the specified class
      const studentsInClass = await Student.find({ classId }).select('studentId');
      const classStudentIds = studentsInClass.map(student => student.studentId);

      if (classStudentIds.length === 0) {
        // No students in this class, return empty array
        return NextResponse.json([]);
      }

      studentIdsFilter = classStudentIds;
    }

    if (teacherId) {
      // Get all classes taught by this teacher
      const Class = (await import('@/lib/models/Class')).default;
      const classesTaught = await Class.find({ teacherId }).select('_id');
      const classIds = classesTaught.map(cls => cls._id.toString());

      if (classIds.length === 0) {
        // Teacher has no classes, return empty array
        return NextResponse.json([]);
      }

      // Get all students in those classes
      const studentsInClasses = await Student.find({ classId: { $in: classIds } }).select('studentId');
      const teacherStudentIds = studentsInClasses.map(student => student.studentId);

      if (teacherStudentIds.length === 0) {
        // No students in teacher's classes, return empty array
        return NextResponse.json([]);
      }

      // Combine with existing student filter if any
      if (studentIdsFilter) {
        studentIdsFilter = studentIdsFilter.filter(id => teacherStudentIds.includes(id));
        if (studentIdsFilter.length === 0) {
          return NextResponse.json([]);
        }
      } else {
        studentIdsFilter = teacherStudentIds;
      }
    }

    // Apply student IDs filter
    if (studentIdsFilter) {
      query.studentId = { $in: studentIdsFilter };
    }

    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // If classId or teacherId are not provided, try to populate them from the student
    let attendanceData = { ...body };

    if (body.studentId && (!body.classId || !body.teacherId)) {
      const student = await Student.findOne({ studentId: body.studentId });
      if (student) {
        if (!body.classId) {
          attendanceData.classId = student.classId;
        }
        if (!body.teacherId) {
          // Get teacher from class
          const Class = (await import('@/lib/models/Class')).default;
          const classInfo = await Class.findById(student.classId);
          if (classInfo) {
            attendanceData.teacherId = classInfo.teacherId;
          }
        }
      }
    }

    const attendance = new Attendance({
      ...attendanceData,
      date: new Date(body.date), // Ensure date is a Date object
    });

    await attendance.save();

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error creating attendance:', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const attendance = await Attendance.findByIdAndUpdate(
      id,
      {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
      },
      { new: true }
    );

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance record' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const attendance = await Attendance.findByIdAndDelete(id);

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}