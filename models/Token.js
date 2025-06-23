import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const TokenSchema = new Schema(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    created_at: { type: Date, default: Date.now, expires: 900 },
  },
  { timestamps: true }
);

export default mongoose.model('Token', TokenSchema);
