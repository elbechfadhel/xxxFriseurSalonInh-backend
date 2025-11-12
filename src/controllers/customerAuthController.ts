// src/controllers/customerAuthController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { verifyOtpVerified } from '../middleware/smsVerified';

const JWT_SECRET = process.env.JWT_SECRET!;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function signCustomerToken(customerId: string) {
    return jwt.sign({ sub: customerId, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
}

/** ---------- Registration precheck (email/phone duplicates) ---------- **/
export const precheckRegistration = async (req: Request, res: Response) => {
    const { email, phoneE164 } = req.body as { email: string; phoneE164: string };
    if (!email || !phoneE164) return res.status(400).json({ error: 'email and phoneE164 required' });

    const [byEmail, byPhone] = await Promise.all([
        prisma.customer.findUnique({ where: { email } }),
        prisma.customer.findUnique({ where: { phoneE164 } }),
    ]);
    if (byEmail) return res.status(409).json({ error: 'Email already in use' });
    if (byPhone) return res.status(409).json({ error: 'Phone already in use' });

    return res.json({ ok: true });
};

/** ------------------------- Register (with OTP) ------------------------- **/
export const customerRegister = async (req: Request, res: Response) => {
    try {
        const { email, password, name, phoneE164, otpToken } = req.body as {
            email: string; password: string; name: string; phoneE164: string; otpToken: string;
        };

        if (!email || !password || !name || !phoneE164 || !otpToken) {
            return res.status(400).json({ error: 'Missing fields (email, password, name, phoneE164, otpToken)' });
        }

        // 1) Verify OTP proof
        let decoded: any;
        try {
            decoded = verifyOtpVerified(otpToken); // { phoneE164, purpose?: string, iat, exp }
        } catch {
            return res.status(401).json({ error: 'Invalid or expired OTP token' });
        }
        if (decoded.phoneE164 !== phoneE164) {
            return res.status(400).json({ error: 'Phone mismatch' });
        }

        // 2) Uniqueness guards
        const [byEmail, byPhone] = await Promise.all([
            prisma.customer.findUnique({ where: { email } }),
            prisma.customer.findUnique({ where: { phoneE164 } }),
        ]);
        if (byEmail) return res.status(409).json({ error: 'Email already in use' });
        if (byPhone) return res.status(409).json({ error: 'Phone already in use' });

        // 3) Create customer with verified phone
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const customer = await prisma.customer.create({
            data: { email, passwordHash, name, phoneE164, phoneVerified: true },
        });

        // 4) Issue login token
        const token = signCustomerToken(customer.id);
        const { passwordHash: _ph, ...safe } = customer as any;
        return res.status(201).json({ token, customer: safe });
    } catch (e: any) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'Email or phone already in use' });
        return res.status(500).json({ error: 'Registration failed' });
    }
};

/** ----------------------------- Login ----------------------------- **/
export const customerLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signCustomerToken(customer.id);
    const { passwordHash, ...safe } = customer as any;
    return res.json({ token, customer: safe });
};

/** ----------------------------- Me ----------------------------- **/
export const customerMe = async (req: Request, res: Response) => {
    // prefer ID from auth middleware (e.g., req.customerId)
    const id = (req as any).customer?.id || (req as any).customerId;
    if (!id) return res.status(401).json({ error: 'Unauthorized' });

    const c = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, phoneE164: true, phoneVerified: true, createdAt: true },
    });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
};

/** ------------------------- Update name/phone ------------------------- **/
export const customerUpdate = async (req: Request, res: Response) => {
    try {
        const id = (req as any).customer?.id || (req as any).customerId;
        if (!id) return res.status(401).json({ error: 'Unauthorized' });

        const { name, phoneE164, otpToken } = req.body as {
            name?: string;
            phoneE164?: string;
            otpToken?: string; // required when phoneE164 is provided
        };

        // If phone is being updated, require otpToken and verify it matches
        if (phoneE164) {
            if (!otpToken) return res.status(400).json({ error: 'otpToken required for phone update' });
            let decoded: any;
            try {
                decoded = verifyOtpVerified(otpToken); // { phoneE164, purpose?: 'phone_update' }
            } catch {
                return res.status(401).json({ error: 'Invalid or expired OTP token' });
            }
            if (decoded.phoneE164 !== phoneE164) {
                return res.status(400).json({ error: 'Phone mismatch' });
            }
            // (optional) enforce purpose
            if (decoded.purpose && decoded.purpose !== 'phone_update') {
                return res.status(400).json({ error: 'OTP purpose mismatch' });
            }
        }

        const updated = await prisma.customer.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(phoneE164
                    ? { phoneE164, phoneVerified: true } // set verified=true because OTP was checked
                    : {}),
            },
            select: { id: true, email: true, name: true, phoneE164: true, phoneVerified: true, createdAt: true },
        });

        res.json(updated);
    } catch (e: any) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'Phone already in use' });
        res.status(500).json({ error: 'Update failed' });
    }
};

/** ------------------------- Change password ------------------------- **/
export const customerChangePassword = async (req: Request, res: Response) => {
    try {
        const id = (req as any).customer?.id || (req as any).customerId;
        if (!id) return res.status(401).json({ error: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Missing currentPassword or newPassword' });
        }

        const customer = await prisma.customer.findUnique({ where: { id } });
        if (!customer) return res.status(404).json({ error: 'Not found' });

        const ok = await bcrypt.compare(currentPassword, customer.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Invalid current password' });

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await prisma.customer.update({ where: { id }, data: { passwordHash } });

        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to change password' });
    }
};
