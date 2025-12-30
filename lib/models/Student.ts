import mongoose from 'mongoose';

export interface IStudent extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  studentId: string;
  classId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new mongoose.Schema<IStudent>({
  name: { type: String, required: true },
  email: { type: String },
  studentId: { type: String, required: true, unique: true },
  classId: { type: String },
}, {
  timestamps: true,
});

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);