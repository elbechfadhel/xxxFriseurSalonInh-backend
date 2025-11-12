// src/controllers/resetPasswordController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { verifyOtpCode, normalizePhone, maskPhone } from '../services/otpService';
import { Prisma } from '@prisma/client';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { phone, code, newPassword } = req.body as {
            phone?: string;
            code?: string;
            newPassword?: string;
        };

        if (!phone || !code || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Normalize to the same format used in PhoneOtp and Customer.phoneE164
        const phoneE164 = normalizePhone(String(phone));
        const userCode = String(code).trim();

        // 1) Verify OTP
        const result = await verifyOtpCode(phoneE164, userCode);
        if (!result.ok) {
            const reason = result.reason === 'locked'
                ? 'Too many attempts. Please try again later.'
                : 'Invalid or expired code.';
            return res.status(result.reason === 'locked' ? 429 : 400).json({ error: reason });
        }

        // 2) Hash password
        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        // 3) Update by unique field phoneE164
        try {
            await prisma.customer.update({
                where: { phoneE164 },
                data: { passwordHash: hash },
            });
        } catch (e: any) {
            // P2025 = record not found for update
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                return res.status(404).json({ error: 'Account not found.' });
            }
            throw e;
        }

        console.log(`[ResetPassword] Password updated for ${maskPhone(phoneE164)}`);
        return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Error resetting password:', err);
        return res.status(500).json({ error: 'Failed to reset password.' });
    }
};
