// models/AssignedJob.js
import mongoose from "mongoose";

const AssignedJobSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // extra denormalized fields (optional but useful)
  jobTitle: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },

  status: {
    type: String,
    enum: ["accepted", "completed", "rated"],
    default: "accepted",
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },

  // Rating and review
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  review: {
    type: String,
    trim: true,
  },
  bidAmount: {
  type: Number,
  required: true
},

});

const AssignedJob = mongoose.model("AssignedJob", AssignedJobSchema);
export default AssignedJob;