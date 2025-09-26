// src/routes/verifyPhoneRoutes.ts
import express from "express";
import rateLimit from "express-rate-limit";
import {
    startSmsVerification,
    checkSmsVerification,
} from "../controllers/verifyPhoneController";

const router = express.Router();

/**
 * Limits:
 * - /start : max 10 demandes / 15 min / IP (anti-spam d’envoi SMS)
 * - /check : max 30 vérifs / 15 min / IP (anti-bruteforce)
 */
const otpStartLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP requests. Please try again later." },
});

const otpCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP verifications. Please try again later." },
});

// Envoi du code par SMS
router.post("/start", otpStartLimiter, startSmsVerification);

// Vérification du code saisi
router.post("/check", otpCheckLimiter, checkSmsVerification);

export default router;
