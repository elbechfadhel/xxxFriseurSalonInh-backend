// src/controllers/verifySmsController.ts
import { Request, Response } from 'express';
import { Twilio } from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

interface SmsCodeEntry {
    code: string;
    expiresAt: number;
}

const verificationStore: Record<string, SmsCodeEntry> = {};

const twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

export const sendSmsCode = async (req: Request, res: Response) => {
    console.log('📦 Incoming body:', req.body);
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    verificationStore[phone] = { code, expiresAt };

    try {
        await twilioClient.messages.create({
            body: `Your verification code is: ${code}`,
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: `+49${phone}` // assumes German number format without +49 prefix
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('SMS error:', error);
        return res.status(500).json({ error: 'Failed to send SMS' });
    }
};

export const confirmSmsCode = (req: Request, res: Response) => {
    const { phone, code } = req.body;
    const entry = verificationStore[phone];

    if (!entry) return res.status(400).json({ error: 'No code found for this phone' });
    if (entry.code !== code) return res.status(400).json({ error: 'Invalid code' });

    if (Date.now() > entry.expiresAt) {
        delete verificationStore[phone];
        return res.status(400).json({ error: 'Code expired' });
    }

    delete verificationStore[phone];
    return res.json({ success: true });
};
