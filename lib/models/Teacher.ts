import mongoose from 'mongoose';

export interface ITeacher extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  teacherId: string;
  status: 'active' | 'inactive';
  profilePicture?: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new mongoose.Schema<ITeacher>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  teacherId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  profilePicture: { type: String },
  companyId: { type: String },
}, {
  timestamps: true,
});

export default mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);