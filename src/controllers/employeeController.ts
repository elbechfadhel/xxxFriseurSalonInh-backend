import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

// GET all employees
export const getAllEmployees = async (_req: Request, res: Response) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(employees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch employees.' });
    }
};

// GET single employee
export const getEmployeeById = async (req: Request, res: Response) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id },
        });
        if (!employee) return res.status(404).json({ error: 'Employee not found.' });
        res.json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch employee.' });
    }
};

// CREATE employee
export const createEmployee = async (req: Request, res: Response) => {
    try {
        const { name, nameAr } = req.body;
        const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

        if (!name) return res.status(400).json({ error: 'Name is required.' });

        const employee = await prisma.employee.create({
            data: { name, nameAr, photoUrl },
        });

        res.status(201).json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create employee.' });
    }
};

// UPDATE employee
export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const { name, nameAr } = req.body;
        const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

        const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Employee not found.' });

        const updated = await prisma.employee.update({
            where: { id: req.params.id },
            data: {
                name: name ?? existing.name,
                nameAr: nameAr ?? existing.nameAr,
                photoUrl: photoUrl ?? existing.photoUrl,
            },
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update employee.' });
    }
};

// DELETE employee
export const deleteEmployee = async (req: Request, res: Response) => {
    try {
        // Check if employee has reservations
        const reservationsCount = await prisma.reservation.count({
            where: { employeeId: req.params.id },
        });

        if (reservationsCount > 0) {
            return res.status(409).json({
                error: 'Cannot delete employee with existing reservations.',
            });
        }

        await prisma.employee.delete({ where: { id: req.params.id } });
        res.json({ message: 'Employee deleted.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete employee.' });
    }
};
