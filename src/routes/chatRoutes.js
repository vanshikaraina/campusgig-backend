// import express from "express";
// import Chat from "../models/Chat.js";
// import { getChatMessages, sendMessage } from "../controllers/chatController.js";

// const router = express.Router();

// // Get all chats for a user
// router.get("/user/:userId", async (req, res) => {
//   const { userId } = req.params;

//   if (!userId) {
//     return res.status(400).json({ message: "User ID is required" });
//   }

//   try {
//     const chats = await Chat.find({
//       $or: [{ posterId: userId }, { acceptedUserId: userId }]
//     }).populate("posterId acceptedUserId", "name email");

//     res.status(200).json(chats);
//   } catch (err) {
//     console.error("fetch user chats error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// // Get chat messages for specific job (between poster & accepted user)
// router.get("/:posterId/:jobId/:acceptedUserId", getChatMessages);

// // Send new message
// router.post("/", sendMessage);

// export default router;

import express from "express";
import Chat from "../models/Chat.js";
import { getChatMessages, sendMessage } from "../controllers/chatController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
// --- AUDIO UPLOAD SETUP ---
const uploadDir = "uploads/audio";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });



// --- ROUTES ---

// Get all chats for a user
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) return res.status(400).json({ message: "User ID is required" });

  try {
    const chats = await Chat.find({
      $or: [{ posterId: userId }, { acceptedUserId: userId }]
    }).populate("posterId acceptedUserId", "name email");

    res.status(200).json(chats);
  } catch (err) {
    console.error("fetch user chats error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get chat messages for a specific job
router.get("/:posterId/:jobId/:acceptedUserId", getChatMessages);

// Mark messages as seen
router.post("/mark-seen", async (req, res) => {
  const { posterId, acceptedUserId, jobId, viewerId } = req.body;

  if (!posterId || !acceptedUserId || !jobId || !viewerId)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    const chat = await Chat.findOne({
      $or: [
        { posterId, acceptedUserId },
        { posterId: acceptedUserId, acceptedUserId: posterId },
      ],
    });

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    chat.messages.forEach((msg) => {
      if (msg.senderId.toString() !== viewerId) {
        msg.seen = true;
      }
    });

    await chat.save();

    // Notify clients in the room via Socket.IO
    const roomId = [posterId, acceptedUserId, jobId].sort().join("-");
    req.io?.to(roomId).emit("messageSeenUpdate", chat.messages);

    res.status(200).json({ success: true, messages: chat.messages });
  } catch (err) {
    console.error("mark-seen error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Send new message
router.post("/", sendMessage);
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // Make URL OS-independent
  const fileUrl = `http://localhost:5000/${req.file.path.split(path.sep).join("/")}`;
  res.json({ url: fileUrl });
});

export default router;
