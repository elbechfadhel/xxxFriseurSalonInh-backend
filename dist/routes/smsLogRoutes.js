"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/smsLogRoutes.ts
const express_1 = require("express");
const smsLogController_1 = require("../controllers/smsLogController");
;
const router = (0, express_1.Router)();
// GET /sms-logs
router.get("/", smsLogController_1.listSmsLogs);
exports.default = router;
