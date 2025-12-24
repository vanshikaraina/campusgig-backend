//modls/job.js

import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  skills: [String], // ✅ new field for required skills
  price: Number,
  deadline: Date,
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // ✅ new field
},
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);