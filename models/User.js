import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    user_name: { type: String, required: true },
    profile_picture: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    device_token: { type: String, default: '' },
    stripe_account_id: { type: String },
    phone: { type: String, required: true },
    role: { type: String  , enum : ["creator", "client"], required:true},
    gender: { type: String,  enum : ["male", "female", "other"] },
    dob: { type: Date },
    address: {
      country: { type: String },
      town: { type: String },
      address: { type: String },
    },
    location: {
      coordinates: [Number], // longitue, latitude not lat,lng
    },
    bio: { type: String },
    interests: { type: [String] },
    settings: {
      general: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibrate: { type: Boolean, default: true },
      updated: { type: Boolean, default: true },
    },
    favourites: { type: [Schema.Types.ObjectId], ref: 'User' },
    storage: {
      max: { type: Number, default: 250 * 1024 * 1024 }, // Default 250MB in bytes
      used: { type: Number, default: 0 }, // in bytes
    },
    storagePurchases: [
      {
        bytes: Number, // Storage added in bytes
        amountPaid: Number, // In dollars (for future payment integration)
        date: { type: Date, default: Date.now },
      },
    ],
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    google: {
  accessToken: { type: String },
  refreshToken: { type: String },
  expiryDate: { type: Number }, // timestamp (ms)
}
  },
  { timestamps: true }
);

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model('User', UserSchema);
