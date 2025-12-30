import mongoose from 'mongoose';

export interface IPayment extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  studentId: string;
  classId: string;
  amount: number;
  type: 'full' | 'half' | 'free';
  date: Date;
  month?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new mongoose.Schema<IPayment>({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['full', 'half', 'free'], required: true },
  date: { type: Date, required: true },
  month: { type: Number },
}, {
  timestamps: true,
});

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);