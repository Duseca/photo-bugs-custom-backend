import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Photo', 'Bundle'], required: true },
    photo: { type: Schema.Types.ObjectId, ref: 'Photo' },
    bundle: { type: Schema.Types.ObjectId, ref: 'PhotoBundle' },
    amount: { type: Number, required: true }, // Total amount paid
    platform_fee: { type: Number, required: true }, // 15% of amount
    photographer_earnings: { type: Number, required: true }, // 85% of amount
    stripe_payment_intent_id: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', TransactionSchema);
