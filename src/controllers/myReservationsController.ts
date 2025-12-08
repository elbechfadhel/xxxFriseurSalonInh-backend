// src/controllers/myReservationsController.ts
import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function getMyReservations(req: Request, res: Response) {
    try {
        const customerId = req.customerId!;
        const items = await prisma.reservation.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        });
        return res.json(items);
    } catch (e) {
        console.error('getMyReservations error:', e);
        return res.status(500).json({ error: 'Failed to fetch reservations' });
    }
}

export async function cancelMyReservation(req: Request, res: Response) {
    try {
        const customerId = req.customerId!;
        const { id } = req.params;

        // Ensure the reservation belongs to this customer
        const r = await prisma.reservation.findUnique({ where: { id } });
        if (!r || r.customerId !== customerId) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        await prisma.reservation.delete({ where: { id } });
        return res.json({ success: true });
    } catch (e) {
        console.error('cancelMyReservation error:', e);
        return res.status(500).json({ error: 'Failed to cancel reservation' });
    }
}
