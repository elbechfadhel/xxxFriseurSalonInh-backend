import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import fs from 'fs';

// GET all employees
export const getAllEmployees = async (_req: Request, res: Response) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, nameAr: true, createdAt: true, updatedAt: true } // exclude photo for performance
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
        const photo = req.file ? fs.readFileSync(req.file.path) : undefined;

        if (!name) return res.status(400).json({ error: 'Name is required.' });

        const employee = await prisma.employee.create({
            data: { name, nameAr, photo },
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
        const photo = req.file ? fs.readFileSync(req.file.path) : undefined;

        const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Employee not found.' });

        const updated = await prisma.employee.update({
            where: { id: req.params.id },
            data: {
                name: name ?? existing.name,
                nameAr: nameAr ?? existing.nameAr,
                photo: photo ?? existing.photo,
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



export const getEmployeePhoto = async (req: Request, res: Response) => {


    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id },
            select: { photo: true },
        });

        if (!employee || !employee.photo) {
            console.log("⚠️ [getEmployeePhoto] No photo found for:", req.params.id);
            return res.status(404).send("No photo found");
        }

        // Detach from Prisma type so we can safely narrow at runtime
        const rawPhoto: unknown = employee.photo;
        let photoBuffer: Buffer;

        // CASE 1: Buffer (classic Node / local Postgres)
        if (rawPhoto instanceof Buffer) {
            photoBuffer = rawPhoto;
        }
        // CASE 2: Uint8Array (common with some drivers / Neon)
        else if (rawPhoto instanceof Uint8Array) {
            photoBuffer = Buffer.from(rawPhoto);
        }
        // CASE 3: string (hex or base64)
        else if (typeof rawPhoto === "string") {
            const photoStr = rawPhoto as string;


            if (photoStr.startsWith("\\x")) {
                // Postgres hex representation: \x89504e47...
                const hex = photoStr.slice(2);
                photoBuffer = Buffer.from(hex, "hex");
            } else {
                // Fallback: treat as base64
                photoBuffer = Buffer.from(photoStr, "base64");
            }
        }
        // CASE 4: Unknown → fail loudly
        else {
            console.error(
                "❌ Unknown photo type at runtime:",
                Object.prototype.toString.call(rawPhoto)
            );
            return res.status(500).send("Invalid photo format.");
        }

        // Your images in DB are PNGs (89504e47…)
        res.set("Content-Type", "image/png");
        res.send(photoBuffer);
    } catch (error) {
        console.error("❌ [getEmployeePhoto] Error:", error);
        res.status(500).json({ error: "Failed to retrieve photo." });
    }
};


