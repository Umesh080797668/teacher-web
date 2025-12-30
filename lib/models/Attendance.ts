import mongoose from 'mongoose';

export interface IAttendance extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  studentId: string;
  date: Date;
  session: string; // e.g., 'morning', 'afternoon'
  status: 'present' | 'absent' | 'late';
  month: number; // 1-12
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new mongoose.Schema<IAttendance>({
  studentId: { type: String, required: true },
  date: { type: Date, required: true },
  session: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
}, {
  timestamps: true,
});

// Compound index for efficient queries by student, year, month
AttendanceSchema.index({ studentId: 1, year: 1, month: 1 });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);