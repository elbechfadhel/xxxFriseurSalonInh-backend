"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailabilityForDay = void 0;
const client_1 = require("../prisma/client");
const getAvailabilityForDay = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        if (!employeeId || !date)
            return res.status(400).json({ error: 'employeeId and date are required' });
        // Day bounds in UTC
        const day = new Date(date + 'T00:00:00.000Z');
        const next = new Date(day);
        next.setUTCDate(day.getUTCDate() + 1);
        const reservations = await client_1.prisma.reservation.findMany({
            where: { employeeId, date: { gte: day, lt: next } },
            select: { date: true },
            orderBy: { date: 'asc' },
        });
        // Return list of ISO strings (normalized by construction)
        res.json(reservations.map(r => r.date.toISOString()));
    }
    catch (e) {
        console.error('availability error', e);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
};
exports.getAvailabilityForDay = getAvailabilityForDay;
