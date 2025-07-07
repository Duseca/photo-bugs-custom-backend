import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const FeedbackSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', FeedbackSchema);
