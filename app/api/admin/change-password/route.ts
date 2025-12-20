import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Database connection helper for serverless / edge-friendly usage
let cachedConnection: any = null;
async function dbConnect() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGODB ||
    'mongodb://localhost:27017/attendance';

  await mongoose.connect(mongoUri, {
    // Mongoose v6+ uses sensible defaults; adjust options if needed
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  cachedConnection = mongoose;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function PUT(req: NextRequest) {
  try {
    // Get the token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get request body
    const { currentPassword, newPassword } = await req.json();

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();
    
    // Get the admin user using native MongoDB driver through Mongoose connection
    const db = mongoose.connection.db;
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const admin = await db.collection('admins').findOne({ 
      email: decoded.email 
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.collection('admins').updateOne(
      { email: decoded.email },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
