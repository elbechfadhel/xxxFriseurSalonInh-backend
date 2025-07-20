// src/controllers/verifyEmailController.ts
import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

interface CodeEntry {
    code: string;
    expiresAt: number;
}

const verificationStore: Record<string, CodeEntry> = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'el.bech.fadhel@gmail.com',       // ✅ replace with your Gmail
        pass: 'stqf lqby etkf orsl',         // ✅ replace with App Password
    },
});

const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

export const sendCode = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    verificationStore[email] = { code, expiresAt };

    try {
        await transporter.sendMail({
            from: '"Nejib Barber Shop" <el.bech.fadhel@gmail.com@gmail.com>',
            to: email,
            subject: 'Your Booking Confirmation Code',
            text: `Your verification code is: ${code}`,
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        return res.status(500).json({ error: 'Failed to send email' });
    }
};

export const confirmCode = (req: Request, res: Response) => {
    const { email, code } = req.body;

    const entry = verificationStore[email];
    if (!entry) return res.status(400).json({ error: 'No code found for this email' });

    if (entry.code !== code) return res.status(400).json({ error: 'Invalid code' });

    if (Date.now() > entry.expiresAt) {
        delete verificationStore[email];
        return res.status(400).json({ error: 'Code expired' });
    }

    delete verificationStore[email];
    return res.json({ success: true });
};
