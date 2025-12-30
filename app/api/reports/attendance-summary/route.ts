import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');
    const teacherId = searchParams.get('teacherId');

    let matchQuery: any = { month, year };
    if (teacherId) {
      // This would require joining with classes, but for simplicity, we'll skip teacher filtering for now
    }

    const summary = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { status: '$status', session: '$session' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.session',
          present: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'present'] }, '$count', 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'absent'] }, '$count', 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'late'] }, '$count', 0]
            }
          }
        }
      }
    ]);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance summary' }, { status: 500 });
  }
}