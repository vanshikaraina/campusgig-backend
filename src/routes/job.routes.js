//routes/jobs.routes.js
import express from "express";
import Job from "../models/Jobs.js";
import AssignedJob from "../models/AssignedJob.js";
import { auth } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import Bid from "../models/Bid.js";
import Activity from "../models/Activity.js"; 
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  notifyNewJob,
  notifyNewBid,
  notifyJobAccepted,
  notifyJobCompleted,
  notifyJobRated,
} from "../utils/notification.js";

const router = express.Router();

/**
 * ------------------- Place a Bid -------------------
 */
router.post("/:id/bid", auth, async (req, res) => {
  try {
    const { bidAmount } = req.body;
    if (!bidAmount) return res.status(400).json({ message: "Bid amount required" });

    // Ensure max 5 bids per job
    const bidCount = await Bid.countDocuments({ job: req.params.id });
    if (bidCount >= 5) {
      return res.status(400).json({ message: "Maximum bids reached for this job" });
    }

    const bid = await Bid.create({
      job: req.params.id,
      student: req.user._id,
      bidAmount,
    });
    
        try {
      const notifBid = { userId: bid.student, message: req.body.message || "" };
      const notifJob = { posterId: job.postedBy, title: job.title, _id: job._id };
      notifyNewBid(notifBid, notifJob).catch(console.error);
    } catch (notifyErr) {
      console.error("notifyNewBid error:", notifyErr);
    }

    res.status(201).json({ message: "Bid placed successfully", bid });
  } catch (err) {
    console.error("Error placing bid:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/activities/me", auth, async (req, res) => {
  try {
    // 1️⃣ Find jobs created by the logged-in user
    const myJobs = await Job.find({ createdBy: req.user._id }).select("_id");

    // 2️⃣ Find activities related to those jobs
    const activities = await Activity.find({
      $or: [
        { user: req.user._id },       // actions you did
         { job: { $in: myJobs.map(j => j._id) } },    // actions on your jobs
      ],
    })
      .populate("user", "name")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ------------------- Get all bids for a job (poster only) -------------------
 */
router.get("/:id/bids", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (String(job.postedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const bids = await Bid.find({ job: req.params.id })
      .populate("student", "name email rating")
      .sort({ bidAmount: 1 });

    res.json(bids);
  } catch (err) {
    console.error("Error fetching bids:", err);
    res.status(500).json({ error: err.message });
  }
});


// ------------------- Select a Winning Bid -------------------
router.put("/:jobId/select/:bidId", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (String(job.postedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const bid = await Bid.findById(req.params.bidId).populate("student");
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    // ✅ Mark this bid as accepted
    bid.status = "accepted";
    await bid.save();

    // ✅ Mark others as rejected
    await Bid.updateMany(
      { job: req.params.jobId, _id: { $ne: req.params.bidId } },
      { $set: { status: "rejected" } }
    );

    // ✅ Update the job to mark it accepted
    job.acceptedBy = bid.student._id;
    await job.save();

    // ✅ Create an AssignedJob
const assignedJob = await AssignedJob.create({
  job: job._id,
  student: bid.student._id,
  jobTitle: job.title,
  studentName: bid.student.name,
  studentEmail: bid.student.email,
  bidAmount: bid.bidAmount, // ✅ Add this line
  status: "accepted",
});

 try {
      const notifJob = { posterId: job.postedBy, title: job.title, _id: job._id };
      notifyJobAccepted(notifJob, bid.student._id).catch(console.error);
    } catch (notifyErr) {
      console.error("notifyJobAccepted error:", notifyErr);
    }

    res.json({ message: "Bid selected and job assigned", assignedJob });
  } catch (err) {
    console.error("Error selecting bid:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Create a Job -------------------
router.post("/", auth, async (req, res) => {
  try {
    const job = new Job({
      ...req.body,
      postedBy: req.user._id
    });
    await job.save();

    // Increment user's jobsPosted
    await User.findByIdAndUpdate(req.user._id, { $inc: { jobsPosted: 1 } });
   await Activity.create({
      user: req.user._id,
      job: job._id,
    jobName: job.title || job.name || "Untitled Job",
      action: "posted",
    });
    // Notify poster about new job (non-blocking)
    try {
      const notifJob = { posterId: job.postedBy, title: job.title, _id: job._id };
      notifyNewJob(notifJob).catch(console.error);
    } catch (notifyErr) {
      console.error("notifyNewJob error:", notifyErr);
    }

    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// ------------------- GET all jobs (unaccepted, optional search/filter) -------------------
router.get("/", auth, async (req, res) => {
  try {
    const { search, role } = req.query;
    const user = await User.findById(req.user._id).lean();

    // Make sure passedJobs are ObjectIds
    const passedJobIds = (user?.passedJobs || []).map(
      id => new mongoose.Types.ObjectId(id)
    );
   // 🛠 Debug log
    console.log("Passed job IDs:", passedJobIds);
    // Base filter: only unaccepted jobs + exclude passed + exclude own jobs
    let filter = {
      acceptedBy: null,
      _id: { $nin: passedJobIds },
      postedBy: { $ne: req.user._id }   // 🚫 exclude jobs posted by current user
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (role && role !== "") {
      filter.category = { $regex: role, $options: "i" };
    }

    const jobs = await Job.find(filter).populate("postedBy", "name email");
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Accept Job -------------------
router.put("/:id/accept", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.acceptedBy) return res.status(400).json({ message: "Job already accepted" });

    job.acceptedBy = req.user._id;
    await job.save();

    const assigned = await AssignedJob.create({
      job: job._id,
      student: req.user._id,
      jobTitle: job.title,
      studentName: req.user.name,
      studentEmail: req.user.email,
      status: "accepted",
      rating: null,
      review: null
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { jobsAccepted: 1 } });
   await Activity.create({
      user: req.user._id,
      job: job._id,
    jobName: job.title || "Untitled Job",
      action: "accepted",
    });
    res.json({ message: "Job accepted", job, assigned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Mark Job Completed -------------------
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const id = req.params.id;
    console.log('📝 Processing job completion:', id);

    // ✅ Find assigned job where the logged-in user is the student
    const assignedJob = await AssignedJob.findOne({
      _id: id,
      student: req.user._id, // ensures only the assigned student can complete it
    });

    if (!assignedJob) {
      console.log('❌ Assigned job not found for this user:', id);
      return res.status(404).json({ message: "Assigned job not found for this user" });
    }

    if (assignedJob.status !== "accepted") {
      console.log('❌ Invalid job status:', assignedJob.status);
      return res.status(400).json({ message: "Only accepted jobs can be marked as completed" });
    }

    // ✅ Fetch related Job and Student data in parallel
    const [job, student] = await Promise.all([
      Job.findById(assignedJob.job).select('title postedBy'),
      User.findById(assignedJob.student).select('name email'),
    ]);

    if (!job) {
      return res.status(404).json({ message: "Related job not found" });
    }

    // ✅ Create Activity after job is fetched
    await Activity.create({
      user: req.user._id,
      job: job._id,
      jobName: job.title,
      action: "completed",
    });

    // ✅ Update statuses
    assignedJob.status = "completed";
    await assignedJob.save();

    await Job.findByIdAndUpdate(assignedJob.job, { status: "completed" });

    // ✅ Prepare full populated data for notifications
    const populatedAssignedJob = {
      ...assignedJob.toObject(),
      job,
      student,
    };

    console.log('📧 Sending completion notifications...');
    try {
      const notifResult = await notifyJobCompleted(populatedAssignedJob);
      if (!notifResult || !notifResult.success) {
        console.error('⚠ Some or all completion notifications failed', notifResult);
      }

      res.json({
        message: "✅ Job marked as completed",
        assignedJob: populatedAssignedJob,
        notification: notifResult || null,
        nextStep: "The job poster will be notified to provide a rating.",
      });
    } catch (notifyErr) {
      console.error("❌ Error sending completion notifications:", notifyErr);

      // Still respond success, just include notification error
      res.json({
        message: "✅ Job marked as completed (notification failed)",
        assignedJob: populatedAssignedJob,
        notification: { success: false, error: notifyErr?.message || String(notifyErr) },
        nextStep: "The job poster will be notified to provide a rating.",
      });
    }
  } catch (err) {
    console.error("❌ Error marking job completed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Rate Completed Job -------------------
router.post("/:id/rate", auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const jobId = req.params.id;
    console.log("📝 Processing rating submission:", { jobId, rating, review });

    // ✅ Try finding AssignedJob by ID first; fallback to job reference
    let assignedJob = await AssignedJob.findById(jobId)
      .populate("student", "name email")
      .populate("job", "title postedBy");

    if (!assignedJob) {
      console.log("⚠️ AssignedJob not found by ID, trying job field lookup...");
      assignedJob = await AssignedJob.findOne({ job: jobId })
        .populate("student", "name email")
        .populate("job", "title postedBy");
    }

    if (!assignedJob) {
      console.log("❌ Assigned job not found for ID:", jobId);
      return res.status(404).json({ message: "Assigned job not found" });
    }

    // ✅ Ensure the job has been completed before rating
    if (assignedJob.status !== "completed") {
      console.log("❌ Invalid job status for rating:", assignedJob.status);
      return res.status(400).json({ message: "Job not completed yet" });
    }

    // ✅ Update rating details
    assignedJob.rating = rating;
    assignedJob.review = review;
    assignedJob.status = "rated";
    await assignedJob.save();

    // ✅ Update student's average rating
    const user = await User.findById(assignedJob.student);
    if (user) {
      user.ratings = user.ratings || [];
      user.ratings.push(rating);
      user.rating = user.ratings.reduce((a, b) => a + b, 0) / user.ratings.length;
      await user.save();
      console.log("⭐ Updated user average rating:", user.rating);
    }

    // ✅ Non-blocking notification
    try {
      console.log("📧 Sending rating notification...");
      await notifyJobRated(assignedJob);
      console.log("✅ Rating notification sent successfully.");
    } catch (notifyErr) {
      console.error("❌ Failed to send rating notification:", notifyErr);
    }

    // ✅ Respond to client
    res.json({
      message: "✅ Rating submitted successfully",
      assignedJob,
      updatedRating: user?.rating || null,
      nextStep: "The student has been rated; feedback stored successfully."
    });
  } catch (err) {
    console.error("❌ Error submitting rating:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Get Accepted Jobs for Current User -------------------
router.get("/accepted", auth, async (req, res) => {
  try {
    const acceptedJobs = await AssignedJob.find({
      student: req.user._id,
      status: { $in: ["accepted", "completed", "rated"] },
    })
      .populate({
        path: "job",
        populate: {
          path: "postedBy",
          model: "User",
          select: "name email _id",
        },
      })
      .populate("student", "name email _id")
      .sort({ assignedAt: -1 });

    res.json(acceptedJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ------------------- Get Jobs Posted by Current User -------------------
router.get("/my", auth, async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id }).populate("acceptedBy", "name email").lean();

    const jobIds = jobs.map(j => j._id);
    const assigned = await AssignedJob.find({ job: { $in: jobIds } }).populate("student", "name email").lean();

    const jobsWithStatus = jobs.map(job => {
      const assignedEntry = assigned.find(a => (a.job?._id || a.job).toString() === job._id.toString());
      return {
        ...job,
        status: assignedEntry?.status || "pending",
        acceptedBy: assignedEntry ? assignedEntry.student : null,
        assignedJobId: assignedEntry?._id,
        rating: assignedEntry?.rating || null,
        review: assignedEntry?.review || null
      };
    });

    res.json(jobsWithStatus);
  } catch (err) {
    res.status(500).json({ message: "Error fetching jobs" });
  }
});
// ✅ Add this near the bottom of jobs.routes.js
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Count jobs posted by the user
    const jobsPostedCount = await Job.countDocuments({ postedBy: userId });

    // Fetch all assigned jobs for the user
    const assignedJobs = await AssignedJob.find({
      student: userId,
      status: { $in: ["accepted", "completed", "rated"] },
    })
      .populate("job", "pay title")
      .lean();

    // Use a Set to count UNIQUE jobs
    const uniqueJobIds = new Set();
    let jobsCompleted = 0;
    let totalEarnings = 0;
    let ratings = [];

    assignedJobs.forEach(j => {
      const jobId = j.job?._id?.toString();
      if (!jobId) return; // skip invalid jobs

      if (!uniqueJobIds.has(jobId)) {
        uniqueJobIds.add(jobId);
      }

      if (["completed", "rated"].includes(j.status)) {
        jobsCompleted++;
        const amt = typeof j.bidAmount === "string" ? parseInt(j.bidAmount.replace(/[^\d]/g, ""), 10) || 0 : j.bidAmount || 0;
        totalEarnings += amt;
        if (typeof j.rating === "number") ratings.push(j.rating);
      }
    });

    const jobsAccepted = uniqueJobIds.size;

    const averageRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : 0.0;

    const user = await User.findById(userId).select("-password").lean();

    res.json({
      user: {
        ...user,
        jobsPosted: jobsPostedCount,
        jobsAccepted,
        jobsCompleted,
        totalEarnings,
        rating: averageRating,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user job data" });
  }
});



// ------------------- Pass Job -------------------
router.post("/:id/pass", auth, async (req, res) => {
  try {
    const jobId = req.params.id;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("Before:", user.passedJobs);

    user.passedJobs = user.passedJobs || [];

    const jobObjectId = new mongoose.Types.ObjectId(jobId);

    if (!user.passedJobs.some(id => id.equals(jobObjectId))) {
      user.passedJobs.push(jobObjectId);
      await user.save();
      console.log("After:", user.passedJobs);
    } else {
      console.log("Job already in passedJobs");
    }

    res.json({ message: "Job passed for this user" });
  } catch (err) {
    console.error("Error in /pass route:", err);
    res.status(500).json({ error: err.message });
  }
});
// ------------------- Get all bids placed by current user -------------------
router.get("/my-bids", auth, async (req, res) => {
  try {
    // Fetch all bids placed by this user
    const bids = await Bid.find({ student: req.user._id })
      .populate({
        path: "job",
        select: "title budget postedBy",
        populate: { path: "postedBy", select: "name email" }
      })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Fetch all assigned jobs that belong to this user
    const assignedJobs = await AssignedJob.find({
      student: req.user._id,
      status: { $in: ["accepted", "completed", "rated"] }
    }).lean();

    // ✅ Create a set of job IDs that were assigned
    const assignedJobIds = new Set(assignedJobs.map(a => a.job.toString()));

    // ✅ Calculate total earnings from all assigned jobs
    const totalEarnings = assignedJobs.reduce(
      (sum, job) => sum + (job.bidAmount || 0),
      0
    );
    console.log("Assigned Jobs:", assignedJobs);
console.log("Total Earnings Calculated:", totalEarnings);


    // ✅ Attach assigned job info to bids (for frontend display)
    const bidsWithAssignedJob = bids.map(bid => ({
      ...bid,
      assignedJob: assignedJobs.find(a => a.job.toString() === bid.job._id.toString()) || null
    }));

    res.json({
      bids: bidsWithAssignedJob,
      totalEarnings
    });
  } catch (err) {
    console.error("Error fetching my bids:", err);
    res.status(500).json({ error: err.message });
  }
});
/**
 * ------------------- Get Job by ID -------------------
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const jobId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid Job ID" });
    }

    const job = await Job.findById(jobId)
      .populate("postedBy", "name email")
      .populate("acceptedBy", "name email");

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.json(job);
  } catch (err) {
    console.error("Error fetching job by ID:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ------------------- Place a Bid -------------------
 */
router.post("/:id/bid", auth, async (req, res) => {
  try {
    const { bidAmount } = req.body;
    if (!bidAmount) return res.status(400).json({ message: "Bid amount required" });

    const bidCount = await Bid.countDocuments({ job: req.params.id });
    if (bidCount >= 5) {
      return res.status(400).json({ message: "Maximum bids reached for this job" });
    }

    const bid = await Bid.create({
      job: req.params.id,
      student: req.user._id,
      bidAmount,
    });

    try {
      const notifBid = { userId: bid.student, message: req.body.message || "" };
      const job = await Job.findById(req.params.id);
      const notifJob = { posterId: job.postedBy, title: job.title, _id: job._id };
      notifyNewBid(notifBid, notifJob).catch(console.error);
    } catch (notifyErr) {
      console.error("notifyNewBid error:", notifyErr);
    }

    res.status(201).json({ message: "Bid placed successfully", bid });
  } catch (err) {
    console.error("Error placing bid:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ------------------- Get all bids for a job (poster only) -------------------
 */
router.get("/:id/bids", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (String(job.postedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const bids = await Bid.find({ job: req.params.id })
      .populate("student", "name email rating")
      .sort({ bidAmount: 1 });

    res.json(bids);
  } catch (err) {
    console.error("Error fetching bids:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Select a Winning Bid -------------------
router.put("/:jobId/select/:bidId", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (String(job.postedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const bid = await Bid.findById(req.params.bidId).populate("student");
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    bid.status = "accepted";
    await bid.save();

    await Bid.updateMany(
      { job: req.params.jobId, _id: { $ne: req.params.bidId } },
      { $set: { status: "rejected" } }
    );

    job.acceptedBy = bid.student._id;
    await job.save();

    const assignedJob = await AssignedJob.create({
      job: job._id,
      student: bid.student._id,
      jobTitle: job.title,
      studentName: bid.student.name,
      studentEmail: bid.student.email,
      bidAmount: bid.bidAmount,
      status: "accepted",
    });

    try {
      const notifJob = { posterId: job.postedBy, title: job.title, _id: job._id };
      notifyJobAccepted(notifJob, bid.student._id).catch(console.error);
    } catch (notifyErr) {
      console.error("notifyJobAccepted error:", notifyErr);
    }

    res.json({ message: "Bid selected and job assigned", assignedJob });
  } catch (err) {
    console.error("Error selecting bid:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;