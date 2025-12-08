import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export const getAvailabilityForDay = async (req: Request, res: Response) => {
    try {
        const { employeeId, date } = req.query as { employeeId?: string; date?: string };
        if (!employeeId || !date) {
            return res.status(400).json({ error: 'employeeId and date are required' });
        }

        const day = new Date(date + 'T00:00:00.000Z');
        const next = new Date(day);
        next.setUTCDate(day.getUTCDate() + 1);

        const reservations = await prisma.reservation.findMany({
            where: { employeeId, date: { gte: day, lt: next } },
            select: { date: true },
            orderBy: { date: 'asc' },
        });

        const taken = reservations.map(r => {
            const d =
                r.date instanceof Date
                    ? r.date
                    : new Date(String(r.date)); // handle string from bad import
            return d.toISOString();
        });

        return res.json(taken);
    } catch (e) {
        console.error('availability error', e);
        return res.status(500).json({ error: 'Failed to fetch availability' });
    }
};

