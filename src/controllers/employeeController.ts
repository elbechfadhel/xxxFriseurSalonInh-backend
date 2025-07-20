import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export const getAllEmployees = async (_req: Request, res: Response) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees.' });
    }
};
