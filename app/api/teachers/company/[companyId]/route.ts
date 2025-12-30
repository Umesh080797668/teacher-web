import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    await dbConnect();
    const { companyId } = await params;

    const teachers = await Teacher.find({ companyId }).sort({ createdAt: -1 });
    return NextResponse.json(teachers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch company teachers' }, { status: 500 });
  }
}