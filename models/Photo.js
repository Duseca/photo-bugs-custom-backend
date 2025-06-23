import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const PhotoSchema = new Schema(
  {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    link: { type: String, required: true },
    metadata: {},
    price: { type: Number, required: true },
    invitees: { type: [String] },
  },
  { timestamps: true }
);

const PhotoBundleSchema = new Schema(
  {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    photos: [
      {
        id: { type: Schema.Types.ObjectId, ref: 'Photo', required: true },
      },
    ],
    price: { type: Number, required: true },
    invitees: { type: [String] },
  },
  { timestamps: true }
);

const FolderSchema = new Schema(
  {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    images: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
    bundles: [{ type: Schema.Types.ObjectId, ref: 'PhotoBundle' }],
    price: { type: Number, required: true },
    // invitees: { type: [String] },
  },
  { timestamps: true }
);

const Photo = mongoose.model('Photo', PhotoSchema);
const Bundle = mongoose.model('PhotoBundle', PhotoBundleSchema);

export { Photo, Bundle };
