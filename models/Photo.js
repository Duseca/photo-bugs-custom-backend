import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const PhotoSchema = new Schema(
  {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    link: { type: String, required: true },
    watermarked_link: { type: String, required: true },
    metadata: {},
    price: { type: Number, required: true },
    ownership: { type: [Schema.Types.ObjectId], ref: 'User' },
    views: { type: Number, default: 0 },        
    lastViewedAt: { type: Date },    
    folder_id: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },          
  },
  { timestamps: true }
);


// const PhotoBundleSchema = new Schema(
//   {
//     created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     folder_id: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },
//     name: { type: String, required: true },
//     photos: {
//       type: [Schema.Types.ObjectId],
//       ref: 'Photo',
//       required: true,
//     },
//     price: { type: Number, required: true },
//     ownership: { type: [Schema.Types.ObjectId], ref: 'User' },
//   },
//   { timestamps: true }
// );

// const FolderSchema = new Schema(
//   {
//     created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
//     name: { type: String, required: true },
//     images: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
//     bundles: [{ type: Schema.Types.ObjectId, ref: 'PhotoBundle' }],
//     price: { type: Number, required: true },
//     invitees: [
//       {
//         email: { type: String },
//         id: { type: Schema.Types.ObjectId, ref: 'User' },
//       },
//     ],
//   },
//   { timestamps: true }
// );

export default mongoose.model('Photo', PhotoSchema);
// const Bundle = mongoose.model('PhotoBundle', PhotoBundleSchema);
// const Folder = mongoose.model('Folder', FolderSchema);
