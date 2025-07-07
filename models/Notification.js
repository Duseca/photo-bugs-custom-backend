import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, required: true },
    is_seen: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', NotificationSchema);
