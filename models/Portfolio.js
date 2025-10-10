import mongoose from "mongoose";
const { Schema } = mongoose;

const PortfolioSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    media: [
      {
        url: [{ type: String, required: true }], // now it's an array
        type: { type: String, enum: ["image", "video"], required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", PortfolioSchema);
