import express from "express";
import { createFeedback, listFeedback, validateFeedback } from "../controllers/feedbackController";


const router = express.Router();

router.post("/", createFeedback);
router.get("/", listFeedback);
router.patch("/:id/approve", /* requireAdmin, */ validateFeedback);

export default router;
