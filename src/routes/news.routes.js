import express from "express";
import { createNews, getAllNews, getNewsById, getLiveNews  } from "../controllers/newsController.js";
import { auth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", auth, createNews);
router.get("/", getAllNews);
router.get("/live", getLiveNews);   // <-- move here
router.get("/:id", getNewsById);

export default router;
