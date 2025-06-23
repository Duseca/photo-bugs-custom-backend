import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    transaction_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: { type: String, enum: ['Image', 'Bundle'], required: true },
    resource_id: { type: Schema.Types.ObjectId, required: true },
    total: { type: Number, required: true },
    description: { type: Text },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', TransactionSchema);
