import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

// Create a new reservation
export const createReservation = async (req: Request, res: Response) => {
  try {
    const { customerName, email, phone, service, date, employeeId } = req.body;

    const reservation = await prisma.reservation.create({
      data: {
        customerName,
        email,          // ✅ use email
        phone: phone || null, // ✅ optional if provided
        service,
        date: new Date(date),
        employeeId,
      },
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};


// Get reservations (optionally filtered by employeeId and/or date)
export const getAllReservations = async (req: Request, res: Response) => {
  try {

    console.log("🔑 Render ENV DATABASE_URL:", process.env.DATABASE_URL);


    const { employeeId, date } = req.query;

    const where: any = {};

    if (employeeId) where.employeeId = String(employeeId);

    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
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
