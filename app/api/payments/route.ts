import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    let query: any = {};
    if (studentId) query.studentId = studentId;
    if (classId) query.classId = classId;
    // For teacherId, we might need to join with classes, but for simplicity, skip for now

    const payments = await Payment.find(query).sort({ date: -1 });
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { studentId, classId, amount, type, date, month } = body;

    const paymentDate = new Date(date);
    const newPayment = new Payment({
      studentId,
      classId,
      amount,
      type,
      date: paymentDate,
      month: month || paymentDate.getMonth() + 1,
    });

    await newPayment.save();
    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const deletedPayment = await Payment.findByIdAndDelete(id);
    if (!deletedPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}