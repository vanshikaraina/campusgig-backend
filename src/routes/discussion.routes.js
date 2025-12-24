// backend/src/routes/discussions.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import DiscussionPost from "../models/DiscussionPost.js";
import { auth } from "../middleware/auth.middleware.js";

const router = express.Router();

// ---------- Multer setup for attachments ----------
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ----------------------------------------------------
// GET ALL DISCUSSIONS (with pagination + tag filter)
// ----------------------------------------------------
router.get("/", async (req, res) => {
  try {
    let { page = 1, limit = 10, tag } = req.query;
    page = Number(page);
    limit = Number(limit);

    const filter = {};
    if (tag && tag !== "all") {
      filter.tags = { $in: [tag] };
    }

    const discussions = await DiscussionPost.find(filter)
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await DiscussionPost.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      discussions,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("🔥 ERROR IN GET /api/discussions:", err);
    res.status(500).json({ message: "Server error while fetching discussions" });
  }
});

// ----------------------------------------------------
// CREATE DISCUSSION
// ----------------------------------------------------
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, tags = [] } = req.body;
    const newPost = await DiscussionPost.create({
      title,
      content,
      tags,
      author: req.user._id,
    });

    await newPost.populate("author", "name");
    res.status(201).json(newPost);
  } catch (err) {
    console.error("Error creating discussion:", err);
    res.status(500).json({ message: "Failed to create discussion." });
  }
});

// ----------------------------------------------------
// GET ONE DISCUSSION + INCREMENT VIEWS
// returns comments populated with user names
// ----------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const post = await DiscussionPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "name")
      .lean();

    if (!post) return res.status(404).json({ message: "Not found" });

    // populate comment user names (since comments are subdocs)
    // Using Promise.all to fetch user names from mongoose refs
    await DiscussionPost.populate(post, { path: "comments.user", select: "name" });

    res.json(post);
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ message: "Failed to fetch." });
  }
});

// ----------------------------------------------------
// UPLOAD ATTACHMENTS (optional helper endpoint)
// Client can also POST attachments with the comment route directly.
// Returns uploaded file metadata { url, fileType }
// ----------------------------------------------------
router.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const fileUrl = `/uploads/${req.file.filename}`;
  const ext = path.extname(req.file.originalname).toLowerCase();
  let fileType = "file";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) fileType = "image";
  else if ([".pdf"].includes(ext)) fileType = "pdf";
  else if ([".js", ".py", ".java", ".cpp", ".c", ".ts"].includes(ext)) fileType = "code";
  res.json({ url: fileUrl, fileType });
});

// ----------------------------------------------------
// ADD COMMENT (supports parentId and attachments via multipart/form-data)
// fields: text, parentId (optional), attachments[] (files)
// ----------------------------------------------------
router.post("/:id/comment", auth, upload.array("attachments", 6), async (req, res) => {
  try {
    const { text, parentId } = req.body;
    const post = await DiscussionPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    const attachments = (req.files || []).map((f) => {
      const ext = path.extname(f.originalname).toLowerCase();
      let fileType = "file";
      if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) fileType = "image";
      else if ([".pdf"].includes(ext)) fileType = "pdf";
      else if ([".js", ".py", ".java", ".cpp", ".c", ".ts"].includes(ext)) fileType = "code";
      return { url: `/uploads/${f.filename}`, fileType };
    });

    const newComment = {
      user: req.user._id,
      text: text || "",
      parentId: parentId || null,
      attachments,
      likes: [],
      isSolution: false,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    // populate the last comment user
    const added = post.comments[post.comments.length - 1];
    await DiscussionPost.populate(added, { path: "user", select: "name" });

    res.status(201).json({ comment: added });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: "Failed to add comment." });
  }
});

// ----------------------------------------------------
// TOGGLE LIKE on a comment: POST /:postId/comment/:commentId/like
// ----------------------------------------------------
router.post("/:postId/comment/:commentId/like", auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await DiscussionPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const uid = req.user._id.toString();
    const idx = (comment.likes || []).findIndex((id) => id.toString() === uid);
    if (idx === -1) {
      comment.likes.push(req.user._id);
    } else {
      comment.likes.splice(idx, 1);
    }

    await post.save();
    await DiscussionPost.populate(comment, { path: "user", select: "name" });

    res.json({ likesCount: comment.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error("Like toggle failed:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

// ----------------------------------------------------
// MARK AS SOLUTION (only post author can toggle)
// POST /:postId/comment/:commentId/solution
// If marking solution, clear any other isSolution true for that post
// ----------------------------------------------------
router.post("/:postId/comment/:commentId/solution", auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await DiscussionPost.findById(postId).populate("author", "_id");
    if (!post) return res.status(404).json({ message: "Post not found" });

    // only post author can mark solution
    if (post.author._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only post author can mark solution." });
    }

    // find comment
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // toggle: if already solution -> unmark; otherwise mark and unmark others
    if (comment.isSolution) {
      comment.isSolution = false;
    } else {
      // unmark any other solutions
      post.comments.forEach((c) => {
        c.isSolution = false;
      });
      comment.isSolution = true;
    }

    await post.save();
    await DiscussionPost.populate(comment, { path: "user", select: "name" });

    res.json({ isSolution: comment.isSolution });
  } catch (err) {
    console.error("Mark solution failed:", err);
    res.status(500).json({ message: "Failed to toggle solution." });
  }
});

export default router;