// models/Portfolio.js
import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String },
  fileUrl: { type: String }, // PDF, PPT, etc.
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Portfolio", portfolioSchema);