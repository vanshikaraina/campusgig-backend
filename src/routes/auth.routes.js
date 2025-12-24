// routes/auth.routes.js
import { Router } from "express";
import { login,logout, signup, me, updateProfile } from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.middleware.js";

const router = Router();

// Public
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Protected
router.get("/me", auth, me);
router.put("/me", auth, updateProfile); // <-- added update profile route

export default router;
