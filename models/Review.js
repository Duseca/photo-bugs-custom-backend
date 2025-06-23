import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ReviewSchema = new Schema(
  {
    review_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    review_for: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ratings: { type: Number, required: true },
    description: { type: Text },
  },
  { timestamps: true }
);

export default mongoose.model('Review', ReviewSchema);
