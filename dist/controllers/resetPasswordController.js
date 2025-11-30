"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("../prisma/client");
const otpService_1 = require("../services/otpService");
const client_2 = require("@prisma/client");
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const resetPassword = async (req, res) => {
    try {
        const { phone, code, newPassword } = req.body;
        if (!phone || !code || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        // Normalize to the same format used in PhoneOtp and Customer.phoneE164
        const phoneE164 = (0, otpService_1.normalizePhone)(String(phone));
        const userCode = String(code).trim();
        // 1) Verify OTP
        const result = await (0, otpService_1.verifyOtpCode)(phoneE164, userCode);
        if (!result.ok) {
            const reason = result.reason === 'locked'
                ? 'Too many attempts. Please try again later.'
                : 'Invalid or expired code.';
            return res.status(result.reason === 'locked' ? 429 : 400).json({ error: reason });
        }
        // 2) Hash password
        const hash = await bcryptjs_1.default.hash(newPassword, BCRYPT_ROUNDS);
        // 3) Update by unique field phoneE164
        try {
            await client_1.prisma.customer.update({
                where: { phoneE164 },
                data: { passwordHash: hash },
            });
        }
        catch (e) {
            // P2025 = record not found for update
            if (e instanceof client_2.Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                return res.status(404).json({ error: 'Account not found.' });
            }
            throw e;
        }
        console.log(`[ResetPassword] Password updated for ${(0, otpService_1.maskPhone)(phoneE164)}`);
        return res.json({ success: true, message: 'Password updated successfully.' });
    }
    catch (err) {
        console.error('Error resetting password:', err);
        return res.status(500).json({ error: 'Failed to reset password.' });
    }
};
exports.resetPassword = resetPassword;
