"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReservations = exports.updateReservation = exports.deleteReservation = exports.createReservation = void 0;
const client_1 = require("../prisma/client");
const time_1 = require("../lib/time");
const client_2 = require("@prisma/client");
// Create a new reservation
const createReservation = async (req, res) => {
    try {
        const { customerName, email, phone, service, date, employeeId, verificationMethod } = req.body;
        if (!date || !employeeId)
            return res.status(400).json({ error: 'Missing required fields' });
        const slotStart = (0, time_1.normalizeToSlotStartUTC)(date);
        const isAccount = verificationMethod === 'account' && req.customer;
        if (isAccount) {
            const customer = req.customer;
            const reservation = await client_1.prisma.reservation.create({
                data: {
                    customerName: customer.name,
                    email: customer.email,
                    phone: customer.phoneE164 ?? null,
                    service,
                    date: slotStart,
                    employeeId,
                    verificationMethod: 'account',
                    customerId: customer.id,
                },
            });
            return res.status(201).json(reservation);
        }
        // Guest (SMS)
        if (!customerName)
            return res.status(400).json({ error: 'Missing customerName for guest' });
        const reservation = await client_1.prisma.reservation.create({
            data: {
                customerName,
                email: email || null,
                phone: phone || null,
                service,
                date: slotStart,
                employeeId,
                verificationMethod: 'sms',
                customerId: null,
            },
        });
        return res.status(201).json(reservation);
    }
    catch (error) {
        if (error instanceof client_2.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Timeslot already taken' });
        }
        console.error('Error creating reservation:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};
exports.createReservation = createReservation;
const deleteReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await client_1.prisma.reservation.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        await client_1.prisma.reservation.delete({ where: { id } });
        res.status(200).json({ message: 'Reservation deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({ error: 'Failed to delete reservation' });
    }
};
exports.deleteReservation = deleteReservation;
const updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, email, phone, service, date, employeeId } = req.body;
        const existing = await client_1.prisma.reservation.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        const updatedReservation = await client_1.prisma.reservation.update({
            where: { id },
            data: {
                customerName,
                email: email || null,
                phone: phone || null,
                service,
                date: date ? new Date(date) : existing.date,
                employeeId
            },
        });
        res.status(200).json(updatedReservation);
    }
    catch (error) {
        console.error('Error updating reservation:', error);
        res.status(500).json({ error: 'Failed to update reservation' });
    }
};
exports.updateReservation = updateReservation;
// Get reservations (optionally filtered by employeeId and/or date)
const getAllReservations = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        const where = {};
        if (employeeId)
            where.employeeId = String(employeeId);
        if (date) {
            const ymd = String(date); // expects YYYY-MM-DD or ISO
            const startOfDay = new Date(ymd + 'T00:00:00.000Z');
            const endOfDayExclusive = new Date(startOfDay);
            endOfDayExclusive.setUTCDate(startOfDay.getUTCDate() + 1);
            where.date = {
                gte: startOfDay,
                lt: endOfDayExclusive,
            };
        }
        const reservations = await client_1.prisma.reservation.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                employee: {
                    select: { name: true }
                },
            },
        });
        res.json(reservations);
    }
    catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
};
exports.getAllReservations = getAllReservations;
