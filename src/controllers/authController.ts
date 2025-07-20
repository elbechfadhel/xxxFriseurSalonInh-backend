// src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const adminLogin = (req: Request, res: Response) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET!, {
        expiresIn: '1d',
    });

    res.json({ token });
};
