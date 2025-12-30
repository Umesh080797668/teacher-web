import mongoose from 'mongoose';

export interface IClass extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new mongoose.Schema<IClass>({
  name: { type: String, required: true },
  teacherId: { type: String, required: true },
}, {
  timestamps: true,
});

export default mongoose.models.Class || mongoose.model<IClass>('Class', ClassSchema);