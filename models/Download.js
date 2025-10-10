
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const DownloadSchema = new Schema(
  {
    photo: { type: Schema.Types.ObjectId, ref: 'Photo', required: true },
    downloaded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Download = mongoose.model('Download', DownloadSchema);
export default Download;
