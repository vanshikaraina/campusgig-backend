import express from "express";
import crypto from "crypto";
import Job from "../models/Jobs.js"; // or "../models/job.js" — match your actual filename

const router = express.Router();

/**
 * Razorpay webhook
 * NOTE: app.js must attach raw body for this path BEFORE express.json()
 *   app.use("/api/webhooks/razorpay", rawBodyMiddleware)
 */
router.post("/webhooks/razorpay", async (req, res) => {
  try {
    // Razorpay signs the RAW request body (bytes)
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.WEBHOOK_SECRET;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody) // Buffer set by your app.js raw-body middleware
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.rawBody.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      const job = await Job.findOne({ "payment.orderId": orderId });
      if (job) {
        job.payment.paymentId = paymentId;
        job.payment.captured = true;
        job.payment.status = "PAID";
        await job.save();
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Server error");
  }
});

export default router;