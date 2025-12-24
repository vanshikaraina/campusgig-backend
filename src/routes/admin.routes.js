import express from "express";
import { auth } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import Job from "../models/Jobs.js";
import AssignedJob from "../models/AssignedJob.js";

const router = express.Router();

// ----------------------
// ADMIN ONLY MIDDLEWARE
// ----------------------
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// ----------------------
// GET ALL USERS
// ----------------------
router.get("/users", auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();
    res.json({ users });
  } catch (err) {
    console.error("Users Error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ----------------------
// GET ALL JOBS + STATUS
// ----------------------
router.get("/jobs", auth, adminOnly, async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("postedBy", "name email")
      .populate("acceptedBy", "name email")   // 🔥 UPDATED
      .lean();

    const ids = jobs.map(j => j._id);

    const assignedJobs = await AssignedJob.find({ job: { $in: ids } }).lean();

    const jobsWithStatus = jobs.map(job => {
      const match = assignedJobs.find(a => String(a.job) === String(job._id));
      return {
        ...job,
        status: match?.status || "pending",
        assignedJobId: match?._id || null,
        acceptedBy: match?.student || null,   // 🔥 UPDATED
      };
    });

    res.json({ jobs: jobsWithStatus });
  } catch (err) {
    console.error("Jobs Error:", err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

// ----------------------
// GET SINGLE USER INFO
// ----------------------
router.get("/user/:id", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ----------------------
// GET ALL JOBS RELATED TO A USER
// posted, accepted, completed
// ----------------------
router.get("/user/:id/jobs", auth, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // 1️⃣ Jobs posted by user
    const posted = await Job.find({ postedBy: userId })
      .populate("postedBy", "name email")
      .populate("acceptedBy", "name email")   // 🔥 UPDATED
      .lean();

    // 2️⃣ AssignedJob entries belonging to this user
    const assignedJobs = await AssignedJob.find({ student: userId })
      .populate({
        path: "job",
        populate: [
          { path: "postedBy", select: "name email" },
          { path: "acceptedBy", select: "name email" }  // 🔥 UPDATED
        ]
      })
      .lean();

    // 3️⃣ Extract based on status
    const accepted = assignedJobs
      .filter(a => a.status === "accepted")
      .map(a => ({
        ...a.job,
        status: a.status,
        acceptedBy: a.job.acceptedBy,
        postedBy: a.job.postedBy,
      }));

    const completed = assignedJobs
      .filter(a => a.status === "completed")
      .map(a => ({
        ...a.job,
        status: a.status,
        acceptedBy: a.job.acceptedBy,
        postedBy: a.job.postedBy,
      }));

    // 4️⃣ Add status into posted jobs
    for (let job of posted) {
      const match = assignedJobs.find(a => String(a.job._id) === String(job._id));
      job.status = match?.status || "pending";
    }

    res.json({ posted, accepted, completed });

  } catch (err) {
    console.error("User Jobs Error:", err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

export default router;
