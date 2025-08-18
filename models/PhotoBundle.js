import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const PhotoBundleSchema = new Schema(
  {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folder_id: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },
    name: { type: String, required: true },
    photos: {
      type: [Schema.Types.ObjectId],
      ref: 'Photo',
      required: true,
    },
    bonus_photos: {
      type: [Schema.Types.ObjectId],
      ref: 'Photo',
      default: [],
    },
    price: { type: Number, required: true },
    ownership: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    cover_photo: { type: Schema.Types.ObjectId, ref: 'Photo' },
  },
  { timestamps: true }
);

export default mongoose.model('PhotoBundle', PhotoBundleSchema);
