import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import Class from '@/lib/models/Class';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // 1. Get all classes for this teacher
    // We need this to get class names and ensure we cover classes with 0 earnings
    const classes = await Class.find({ teacherId });
    
    if (classes.length === 0) {
      return NextResponse.json([]);
    }

    const classMap = new Map();
    classes.forEach(cls => {
      classMap.set(cls._id.toString(), cls.name);
    });

    const classIds = classes.map(c => c._id.toString());

    // 2. Build aggregation pipeline for Payments
    const matchStage: any = {
      classId: { $in: classIds }
    };

    if (year) {
      matchStage.year = parseInt(year);
    }
    
    if (month) {
      matchStage.month = parseInt(month);
    }

    const earnings = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            classId: "$classId",
            year: "$year",
            month: "$month"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      }
    ]);

    // 3. Transform data to required format
    // Structure: [{ classId, className, monthlyBreakdown: [{ month, year, amount, paymentCount }] }]
    
    const result: any[] = [];
    const breakdownByClass = new Map<string, any[]>();

    // Initialize Map for all classes to ensure even empty ones are present (optional, but good for reports)
    // The interface implies we list classes.
    
    earnings.forEach(item => {
      const cId = item._id.classId;
      if (!breakdownByClass.has(cId)) {
        breakdownByClass.set(cId, []);
      }
      
      breakdownByClass.get(cId)?.push({
        month: item._id.month || 0, // Fallback if month is missing (shouldn't be if schema enforced)
        year: item._id.year || 0,
        amount: item.totalAmount,
        paymentCount: item.count
      });
    });

    // Construct final array
    classes.forEach(cls => {
      const cId = cls._id.toString();
      const breakdowns = breakdownByClass.get(cId) || [];
      
      // If specific year/month were requested but no data found, we might return empty breakdown
      // But if we want to show zeros, we'd need to generate them. 
      // For now, returning what we found is safer.

      result.push({
        classId: cId,
        className: cls.name,
        monthlyBreakdown: breakdowns
      });
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
