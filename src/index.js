import "dotenv/config";
import { connectDB } from "./config/db.js";
import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Chat from "./models/Chat.js";

const PORT = process.env.PORT || 5000;

await connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

const users = {}; // userId -> socket.id

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.emit("me", socket.id);

  // CHAT
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(socket.id, "joined room", roomId);
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(socket.id, "left room", roomId);
  });

  socket.on("sendMessage", async (msgData) => {
    try {
      const { posterId, acceptedUserId, jobId, senderId } = msgData;

      const posterObjId = new mongoose.Types.ObjectId(posterId);
      const acceptedObjId = new mongoose.Types.ObjectId(acceptedUserId);
      const senderObjId = new mongoose.Types.ObjectId(senderId);
      const jobObjId = new mongoose.Types.ObjectId(jobId);

      let chat = await Chat.findOne({
        $or: [
          { posterId: posterObjId, acceptedUserId: acceptedObjId },
          { posterId: acceptedObjId, acceptedUserId: posterObjId },
        ],
      });

      if (!chat) {
        chat = new Chat({
          posterId: posterObjId,
          acceptedUserId: acceptedObjId,
          messages: [],
        });
      }

      chat.messages.push({
        senderId: senderObjId,
        text: msgData.text || "",
        file: msgData.file || "",
        fileType: msgData.fileType || "",
        jobId: jobObjId,
      });

      await chat.save();

      const roomId = [posterId, acceptedUserId, jobId].sort().join("-");
      const newMsg = chat.messages[chat.messages.length - 1];

      io.to(roomId).emit("newMessage", newMsg);
    } catch (err) {
      console.error("Socket sendMessage error:", err);
    }
  });

  socket.on("messageSeen", async ({ posterId, acceptedUserId, jobId, viewerId }) => {
    try {
      const posterObjId = new mongoose.Types.ObjectId(posterId);
      const acceptedObjId = new mongoose.Types.ObjectId(acceptedUserId);

      const chat = await Chat.findOne({
        $or: [
          { posterId: posterObjId, acceptedUserId: acceptedObjId },
          { posterId: acceptedObjId, acceptedUserId: posterObjId },
        ],
      });

      if (!chat) return;

      chat.messages.forEach((msg) => {
        if (msg.senderId.toString() !== viewerId) {
          msg.seen = true;
        }
      });

      await chat.save();

      const roomId = [posterId, acceptedUserId, jobId].sort().join("-");
      io.to(roomId).emit("messageSeenUpdate", chat.messages);
    } catch (err) {
      console.error("Socket messageSeen error:", err);
    }
  });

  // VIDEO CALL
  socket.on("registerUser", (userId) => {
    socket.userId = userId;
    users[userId] = socket.id;
    console.log(`🟢 Registered user ${userId} with socket ${socket.id}`);
    io.emit("onlineUsers", Object.keys(users));
  });

  socket.on("callUser", (data) => {
    const targetSocketId = users[data.userToCall];
    if (targetSocketId) {
      console.log(`📞 Call initiated from ${data.from} to ${data.userToCall}`);
      io.to(targetSocketId).emit("callIncoming", {
        signal: data.signal,
        from: data.from,
        name: data.name,
      });
    } else {
      console.log(`⚠️ User ${data.userToCall} not online`);
    }
  });

  socket.on("answerCall", (data) => {
    const targetSocketId = users[data.to];
    if (targetSocketId) {
      console.log(`✅ Forwarding answer from ${socket.userId} to ${data.to}`);
      io.to(targetSocketId).emit("callAccepted", data.signal);
    }
  });

  socket.on("rejectCall", (data) => {
    const targetSocketId = users[data.to];
    if (targetSocketId) {
      io.to(targetSocketId).emit("callRejected");
    }
  });

  socket.on("iceCandidate", ({ candidate, to }) => {
    const targetSocketId = users[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", candidate);
    }
  });

  socket.on("endCall", ({ from, to }) => {
    if (!from || !to) {
      console.log("endCall missing from/to", { from, to });
      return;
    }
    console.log("📴 endCall received:", { from, to });
    const callerSocket = users[from];
    const receiverSocket = users[to];

    if (receiverSocket) {
      io.to(receiverSocket).emit("callEnded", { by: from });
      console.log(`📤 Sent callEnded to receiver ${to}`);
    }
    if (callerSocket) {
      io.to(callerSocket).emit("callEnded", { by: from });
      console.log(`📤 Sent callEnded to caller ${from}`);
    }
    console.log(`✅ Call fully ended between ${from} and ${to}`);
  });

  // disconnect
  socket.on("disconnect", () => {
    for (const id in users) {
      if (users[id] === socket.id) {
        delete users[id];
        break;
      }
    }
    io.emit("onlineUsers", Object.keys(users));
    console.log("❌ Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
