// routes/user.routes.js (new route)
import express from "express";
import AssignedJob from "../models/AssignedJob.js";
import { auth } from "../middleware/auth.middleware.js";
import User from "../models/User.js";

const router = express.Router();

// Get user stats including rating
router.get("/stats", auth, async (req, res) => {
  try {
    const jobs = await AssignedJob.find({ student: req.user._id, status: "rated" });

    let avgRating = 0;
    if (jobs.length > 0) {
      const total = jobs.reduce((acc, j) => acc + j.rating, 0);
      avgRating = total / jobs.length;
    }

    res.json({
      jobsPosted: await Job.countDocuments({ postedBy: req.user._id }),
      jobsAccepted: await AssignedJob.countDocuments({ student: req.user._id }),
      earnings: await AssignedJob.aggregate([
        { $match: { student: req.user._id } },
        { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "job" } },
        { $unwind: "$job" },
        { $group: { _id: null, total: { $sum: "$job.price" } } }
      ]).then(res => res[0]?.total || 0),
      rating: avgRating.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});
// GET user portfolio by ID
router.get("/:id/portfolio", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name portfolio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// 🆕 --- SAVED JOBS FEATURE ---

// Save a job
router.post("/save-job/:jobId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.savedJobs.includes(req.params.jobId)) {
      user.savedJobs.push(req.params.jobId);
      await user.save();
    }
    res.status(200).json({ message: "Job saved successfully", savedJobs: user.savedJobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unsave a job
router.delete("/unsave-job/:jobId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.savedJobs = user.savedJobs.filter(
      (jobId) => jobId.toString() !== req.params.jobId
    );
    await user.save();
    res.status(200).json({ message: "Job removed from saved list", savedJobs: user.savedJobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all saved jobs
router.get("/saved-jobs", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("savedJobs");
    res.status(200).json(user.savedJobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
export default router;