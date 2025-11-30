"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyReservations = getMyReservations;
exports.cancelMyReservation = cancelMyReservation;
const client_1 = require("../prisma/client");
async function getMyReservations(req, res) {
    try {
        const customerId = req.customerId;
        const items = await client_1.prisma.reservation.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
            include: { employee: { select: { name: true } } },
        });
        return res.json(items);
    }
    catch (e) {
        console.error('getMyReservations error:', e);
        return res.status(500).json({ error: 'Failed to fetch reservations' });
    }
}
async function cancelMyReservation(req, res) {
    try {
        const customerId = req.customerId;
        const { id } = req.params;
        // Ensure the reservation belongs to this customer
        const r = await client_1.prisma.reservation.findUnique({ where: { id } });
        if (!r || r.customerId !== customerId) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        await client_1.prisma.reservation.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (e) {
        console.error('cancelMyReservation error:', e);
        return res.status(500).json({ error: 'Failed to cancel reservation' });
    }
}
