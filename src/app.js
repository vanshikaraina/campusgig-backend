//app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";
import chatRoutes from "./routes/chatRoutes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import path from "path";
import userRoutes from "./routes/user.routes.js";          // ✅ added
import webhooksRoutes from "./routes/webhooks.routes.js";  // ✅ Razorpay webhooks
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import discussionRoutes from "./routes/discussion.routes.js";
import newsRoutes from "./routes/news.routes.js";

const app = express();

/* -------------------------------------------------------
   ✅ 1. RAW BODY FOR RAZORPAY WEBHOOK (must come first)
   ------------------------------------------------------- */
app.use("/api/webhooks/razorpay", (req, res, next) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks); // store raw body for signature verification
    next();
  });
});


// app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(cors({
  origin: "http://localhost:5173", // your frontend URL
  credentials: true,              // ✅ allow cookies
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Serve uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);

app.use("/api/chat", chatRoutes);
app.use("/api/portfolio", portfolioRoutes); // ✅ matches frontend

app.use("/api", webhooksRoutes);  
app.use("/api/users", userRoutes);          // ✅ added user routes
app.use("/api/payment/jobs", paymentRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api/news", newsRoutes);

export default app;