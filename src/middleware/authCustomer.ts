import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) return res.status(401).json({ error: 'No token' });

        const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; role?: string };
        if (decoded.role !== 'customer') return res.status(401).json({ error: 'Wrong token role' });

        const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
        if (!customer) return res.status(401).json({ error: 'Invalid token' });

        (req as any).customer = customer;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// “Soft” variant: attach customer if present; don’t fail if absent
export async function attachCustomerIfAny(req: Request, _res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) return next();

        const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; role?: string };
        if (decoded.role !== 'customer') return next();

        const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
        if (customer) (req as any).customer = customer;
    } catch {
        // ignore
    } finally {
        next();
    }
}
