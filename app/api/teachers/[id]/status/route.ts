import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { status } = await request.json();

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      params.id,
      { status },
      { new: true }
    );

    if (!updatedTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update teacher status' }, { status: 500 });
  }
}