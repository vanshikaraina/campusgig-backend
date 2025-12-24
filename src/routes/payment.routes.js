// backend/routes/jobs.routes.js
import express from "express";
import razorpay from "../config/razorpayClient.js"; // ✅ ensure this file exports { razorpay }
import Job from "../models/Jobs.js";
import { auth } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * 1️⃣ Select a bid (accept a job)
 * POST /api/jobs/:id/accept
 * Marks the job as accepted, but does NOT create payment yet
 */
router.post("/:id/accept", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "OPEN")
      return res.status(400).json({ error: "Job is not open" });

    // Accept the job (whoever posted or selected the bid)
    job.acceptedBy = req.user._id;
    job.status = "ACCEPTED";
    job.acceptedAt = new Date();

    // Initialize payment status
    job.payment = {
      status: "PENDING",
    };

    await job.save();

    res.json({
      message: "Bid selected successfully!",
      job,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to select bid" });
  }
});

/**
 * 2️⃣ Create Razorpay payment (Pay Now)
 * POST /api/jobs/:id/create-payment
 * Only works if a bid is already accepted
 */
router.post("/:id/create-payment", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.acceptedBy)
      return res.status(400).json({ error: "No bid accepted yet" });

    const platformFee = Math.round(job.price * 0.1);
    const workerPayout = job.price - platformFee;

    console.log("💡 Job amount:", job.price);
console.log("💡 Razorpay client:", razorpay ? "Loaded ✅" : "Not loaded ❌");

    const order = await razorpay.orders.create({
      amount: job.price*100, // in paise
      currency: job.currency || "INR",
      receipt: `job_${job._id}`,
      partial_payment: false,
    });

    job.payment = {
      orderId: order.id,
      heldAmount: job.price,
      platformFee,
      workerPayout,
      status: "PENDING",
    };

    await job.save();

    res.json({
      payment: {
        orderId: order.id,
        amount: job.price,
        currency: job.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment creation failed" });
  }
});


// ✅ Release payment after job completion (CampusGig -> Student)
router.post("/jobs/:jobId/release-payment", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const assigned = await AssignedJob.findOne({ job: job._id });
    if (!assigned) return res.status(404).json({ message: "Assigned job not found" });

    if (job.payment?.status !== "PENDING")
      return res.status(400).json({ message: "No pending payment to release" });

    // (Future) call Razorpay payout API to pay student
    job.payment.status = "RELEASED";
    assigned.status = "paid";

    await job.save();
    await assigned.save();

    res.json({ message: "Payment released to student successfully" });
  } catch (err) {
    console.error("Error releasing payment:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
