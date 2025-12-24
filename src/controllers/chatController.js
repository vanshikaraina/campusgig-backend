// import Chat from "../models/Chat.js";
// import mongoose from "mongoose";

// // Get chat messages (filter by jobId at message level)
// export const getChatMessages = async (req, res) => {
//   const { posterId, jobId, acceptedUserId } = req.params;

//   try {
//     // Convert IDs to ObjectId
//     const posterObjId = new mongoose.Types.ObjectId(posterId);
//     const acceptedObjId = new mongoose.Types.ObjectId(acceptedUserId);

//     // Find chat between these 2 users
//     let chat = await Chat.findOne({
//       $or: [
//         { posterId: posterObjId, acceptedUserId: acceptedObjId },
//         { posterId: acceptedObjId, acceptedUserId: posterObjId }
//       ]
//     });

//     // If chat doesn't exist, create it
//     if (!chat) {
//       chat = new Chat({
//         posterId: posterObjId,
//         acceptedUserId: acceptedObjId,
//         messages: []
//       });
//       await chat.save();
//     }

//     // Filter only messages related to this job
//     const filteredMessages = chat.messages.filter(
//       (msg) => msg.jobId?.toString() === jobId
//     );

//     res.status(200).json(filteredMessages);
//   } catch (err) {
//     console.error("getChatMessages error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Send a new message
// export const sendMessage = async (req, res) => {
//   const { posterId, acceptedUserId, jobId, senderId, text } = req.body;

//   if (!posterId || !acceptedUserId || !jobId || !senderId || !text) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     // Convert all IDs to ObjectId
//     const posterObjId = new mongoose.Types.ObjectId(posterId);
//     const acceptedObjId = new mongoose.Types.ObjectId(acceptedUserId);
//     const senderObjId = new mongoose.Types.ObjectId(senderId);
//     const jobObjId = new mongoose.Types.ObjectId(jobId);

//     let chat = await Chat.findOne({
//       $or: [
//         { posterId: posterObjId, acceptedUserId: acceptedObjId },
//         { posterId: acceptedObjId, acceptedUserId: posterObjId }
//       ]
//     });

//     if (!chat) {
//       chat = new Chat({
//         posterId: posterObjId,
//         acceptedUserId: acceptedObjId,
//         messages: []
//       });
//     }

//     chat.messages.push({ senderId: senderObjId, text, jobId: jobObjId });
//     await chat.save();

//     const jobMessages = chat.messages.filter(
//       (msg) => msg.jobId.toString() === jobObjId.toString()
//     );

//     res.status(200).json(jobMessages);
//   } catch (err) {
//     console.error("sendMessage error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

import Chat from "../models/Chat.js";
import mongoose from "mongoose";

// Get chat messages (filter by jobId)
export const getChatMessages = async (req, res) => {
  const { posterId, jobId, acceptedUserId } = req.params;

  try {
    const posterObjId = new mongoose.Types.ObjectId(posterId);
    const acceptedObjId = new mongoose.Types.ObjectId(acceptedUserId);

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
      await chat.save();
    }

    const filteredMessages = chat.messages.filter(
      (msg) => msg.jobId?.toString() === jobId
    );

    res.status(200).json(filteredMessages);
  } catch (err) {
    console.error("getChatMessages error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Send a new message (text or file)
export const sendMessage = async (req, res) => {
  const { posterId, acceptedUserId, jobId, senderId, text, file, fileType } = req.body;

  if (!posterId || !acceptedUserId || !jobId || !senderId || (!text && !file)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
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

    const newMessage = {
      senderId: senderObjId,
      text: text || "",
      file: file || "",
      fileType: fileType || "",
      jobId: jobObjId,
    };

    chat.messages.push(newMessage);
    await chat.save();

    const jobMessages = chat.messages.filter(
      (msg) => msg.jobId.toString() === jobObjId.toString()
    );

    res.status(200).json(jobMessages);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ message: err.message });
  }
};
