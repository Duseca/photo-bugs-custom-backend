import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    photographer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },

    // ✅ Correct geospatial location field
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    date: { type: Date, required: true },
    time_start: { type: Number, required: true },
    time_end: { type: Number, required: true },
    type: { type: String, required: true },
    role: { type: String, required: true },
    mature_content: { type: Boolean, required: true },

    recipients: [
      {
        email: { type: String },
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

EventSchema.index({ location: '2dsphere' });

export default mongoose.model('Event', EventSchema);
