import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ChatSchema = new Schema(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      // validate: [arrayLimit, '{PATH} must have exactly 2 participants']
    },
    lastSeen: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    messages: [
      {
        created_by: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        type: {
          type: String,
          enum: ['Text', 'Photo', 'Bundle'],
          required: true,
        },
        content: { type: String, required: true },
        photo: { type: Schema.Types.ObjectId, ref: 'Photo' },
        bundle: { type: Schema.Types.ObjectId, ref: 'Bundle' },
        isRead: { type: Boolean, default: false },
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Validate exactly 2 participants
// function arrayLimit(val) {
//   return val.length === 2;
// }

export default mongoose.model('Chat', ChatSchema);
