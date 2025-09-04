import express from "express";
import {createFeedback, deleteFeedback, listFeedback, validateFeedback} from "../controllers/feedbackController";


const router = express.Router();

router.post("/", createFeedback);
router.get("/", listFeedback);
router.patch("/:id/approve", /* requireAdmin, */ validateFeedback);
router.delete("/:id", /* requireAdmin, */ deleteFeedback);

export default router;
