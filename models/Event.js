import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const EventSchema = new Schema(
  {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    photographer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    location: {
      coordinates: [Number], // longitue, latitude not lat,lng
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
        id: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Event', EventSchema);
