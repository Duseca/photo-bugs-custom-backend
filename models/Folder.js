import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const FolderSchema = new Schema(
  {
    name: { type: String, required: true },
    event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    drive_folder_id:{type:String, default:''},
    event_drive_folder_id:{type:String, default:''},
    recipients: [
      {
        email: String,
        id: { type: Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined'],
          default: 'pending',
        },
      },
    ],
    // cover_photo: { type: Schema.Types.ObjectId, ref: 'Photo' },
  },
  { timestamps: true }
);

export default mongoose.model('Folder', FolderSchema);
