import mongoose from "mongoose";
import bcrypt from "bcrypt";

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    user_name: { type: String, required: true },
    profile_picture: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    phone: { type: String, required: true },
    device_token: { type: String, default: "" },
    stripe_account_id: { type: String },
    role: { type: String, enum: ["creator", "client"] },
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: { type: Date },
    address: {
      country: { type: String },
      town: { type: String },
      address: { type: String },
    },
    location: {
      coordinates: [Number], // longitude, latitude
    },
    bio: { type: String },
    interests: { type: [String] },
    settings: {
      general: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibrate: { type: Boolean, default: true },
      updated: { type: Boolean, default: true },
    },
    favourites: { type: [Schema.Types.ObjectId], ref: "User" },
    storage: {
      max: { type: Number, default: 250 * 1024 * 1024 }, // Default 250MB
      used: { type: Number, default: 0 },
    },
    socialProvider: {
      type: String,
      enum: ["google", "facebook", null],
      default: null,
    },
    socialId: { type: String, default: null },
    storagePurchases: [
      {
        bytes: Number,
        amountPaid: Number,
        date: { type: Date, default: Date.now },
      },
    ],
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    googleTokens: {
      access_token: { type: String },
      refresh_token: { type: String },
      expiry_date: { type: Number },
      serverAuthCode: { type: String },
    },
  },
  { timestamps: true }
);

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model("User", UserSchema);
