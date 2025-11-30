"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/verifyPhoneRoutes.ts
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const verifyPhoneController_1 = require("../controllers/verifyPhoneController");
const router = express_1.default.Router();
/**
 * Limits:
 * - /start : max 10 demandes / 15 min / IP (anti-spam d’envoi SMS)
 * - /check : max 30 vérifs / 15 min / IP (anti-bruteforce)
 */
const otpStartLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP requests. Please try again later." },
});
const otpCheckLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP verifications. Please try again later." },
});
// Envoi du code par SMS
router.post("/start", otpStartLimiter, verifyPhoneController_1.startSmsVerification);
// Vérification du code saisi
router.post("/check", otpCheckLimiter, verifyPhoneController_1.checkSmsVerification);
exports.default = router;
