// src/middleware/requireCustomer.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            customerId?: string;
        }
    }
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (!decoded?.sub) return res.status(401).json({ error: 'Unauthorized' });

        req.customerId = String(decoded.sub);
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
