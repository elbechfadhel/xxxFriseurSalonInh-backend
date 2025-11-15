// src/routes/smsLogRoutes.ts
import { Router } from "express";
import { listSmsLogs } from "../controllers/smsLogController";
;

const router = Router();

// GET /sms-logs
router.get("/", listSmsLogs);

export default router;
