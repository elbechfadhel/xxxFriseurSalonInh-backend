import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import {normalizeToSlotStartUTC} from "../lib/time";
import { Prisma } from '@prisma/client';

// Create a new reservation
export const createReservation = async (req: Request, res: Response) => {
  try {
    const { customerName, email, phone, service, date, employeeId } = req.body;

    if (!customerName || !email || !date || !employeeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const slotStart = normalizeToSlotStartUTC(date);

    const reservation = await prisma.reservation.create({
      data: {
        customerName,
        email: email || null,
        phone: phone || null,
        service,
        date: slotStart,       // store normalized slot
        employeeId,
      },
    });

    return res.status(201).json(reservation);
  } catch (error: any) {
    // Unique violation -> slot already taken
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Timeslot already taken' });
    }
    console.error('Error creating reservation:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    await prisma.reservation.delete({ where: { id } });

    res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
};

export const updateReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, email, phone, service, date, employeeId } = req.body;

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const updatedReservation = await prisma.reservation.update({
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
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
};




// Get reservations (optionally filtered by employeeId and/or date)
export const getAllReservations = async (req: Request, res: Response) => {
  try {

    const { employeeId, date } = req.query;
    const where: any = {};

    if (employeeId) where.employeeId = String(employeeId);

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

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        employee: {
          select: { name: true }
        },
      },
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
};
