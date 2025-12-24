// backend/src/models/DiscussionPost.js
import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  url: String,
  fileType: String, // "image", "pdf", "doc", "code", etc.
});

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  text: {
    type: String,
    trim: true,
  },

  // ⭐ NEW — nested replies
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  // ⭐ NEW — likes / upvotes
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  // ⭐ NEW — attachments (images, files, pdfs)
  attachments: [attachmentSchema],

  // ⭐ NEW — mark as solution feature
  isSolution: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const discussionPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tags: [String],

    // ⭐ All enhanced comments
    comments: [commentSchema],

    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const DiscussionPost = mongoose.model(
  "DiscussionPost",
  discussionPostSchema
);

export default DiscussionPost;