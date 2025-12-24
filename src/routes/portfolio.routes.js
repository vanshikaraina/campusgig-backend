// src/routes/portfolio.routes.js
import express from "express";
import multer from "multer";
import { auth } from "../middleware/auth.middleware.js";
import Portfolio from "../models/Portfolio.js";

const router = express.Router();

// ---------------- Multer setup for file uploads ----------------
const storage = multer.diskStorage({
  destination: "uploads/", // folder where files will be stored
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/**
 * ---------------- GET Portfolio for a user ----------------
 * @route GET /api/portfolio/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const projects = await Portfolio.find({ user: req.params.userId }).populate("user", "name email");
    res.json({
      ownerName: projects[0]?.user?.name || "User",
      projects,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

/**
 * ---------------- Add new portfolio project ----------------
 * @route POST /api/portfolio
 * @access Private
 */
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    const { title, description, link } = req.body;

    const newProject = new Portfolio({
      title,
      description,
      link,
      user: req.user._id, // associate with logged-in user
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null, // save file path
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add project" });
  }
});

/**
 * ---------------- Delete a project ----------------
 * @route DELETE /api/portfolio/:id
 * @access Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const project = await Portfolio.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // only owner can delete
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;