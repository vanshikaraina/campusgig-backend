// models/Chat.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: String,
  text: String,
  file: String,         // added
  fileType: String,     // added: "audio", "image", "video"
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  seen: { type: Boolean, default: false }, // ← add this
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema({
  posterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  acceptedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  messages: [messageSchema],
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
