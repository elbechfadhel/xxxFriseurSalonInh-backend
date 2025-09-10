import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export const getAvailabilityForDay = async (req: Request, res: Response) => {
    try {
        const { employeeId, date } = req.query as { employeeId?: string; date?: string };
        if (!employeeId || !date) return res.status(400).json({ error: 'employeeId and date are required' });

        // Day bounds in UTC
        const day = new Date(date + 'T00:00:00.000Z');
        const next = new Date(day);
        next.setUTCDate(day.getUTCDate() + 1);

        const reservations = await prisma.reservation.findMany({
            where: { employeeId, date: { gte: day, lt: next } },
            select: { date: true },
            orderBy: { date: 'asc' },
        });

        // Return list of ISO strings (normalized by construction)
        res.json(reservations.map(r => r.date.toISOString()));
    } catch (e) {
        console.error('availability error', e);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
};
