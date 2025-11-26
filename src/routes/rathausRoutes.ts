// src/routes/rathausRoutes.ts
import express from "express";
import { getRathausDepartures } from "../controllers/rathausController";

const router = express.Router();

// GET /api/rathaus
router.get("/", getRathausDepartures);

export default router;
