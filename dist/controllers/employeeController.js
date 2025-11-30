"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeePhoto = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getAllEmployees = void 0;
const client_1 = require("../prisma/client");
const fs_1 = __importDefault(require("fs"));
// GET all employees
const getAllEmployees = async (_req, res) => {
    try {
        const employees = await client_1.prisma.employee.findMany({
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, nameAr: true, createdAt: true, updatedAt: true } // exclude photo for performance
        });
        res.json(employees);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch employees.' });
    }
};
exports.getAllEmployees = getAllEmployees;
// GET single employee
const getEmployeeById = async (req, res) => {
    try {
        const employee = await client_1.prisma.employee.findUnique({
            where: { id: req.params.id },
        });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found.' });
        res.json(employee);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch employee.' });
    }
};
exports.getEmployeeById = getEmployeeById;
// CREATE employee
const createEmployee = async (req, res) => {
    try {
        const { name, nameAr } = req.body;
        const photo = req.file ? fs_1.default.readFileSync(req.file.path) : undefined;
        if (!name)
            return res.status(400).json({ error: 'Name is required.' });
        const employee = await client_1.prisma.employee.create({
            data: { name, nameAr, photo },
        });
        res.status(201).json(employee);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create employee.' });
    }
};
exports.createEmployee = createEmployee;
// UPDATE employee
const updateEmployee = async (req, res) => {
    try {
        const { name, nameAr } = req.body;
        const photo = req.file ? fs_1.default.readFileSync(req.file.path) : undefined;
        const existing = await client_1.prisma.employee.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Employee not found.' });
        const updated = await client_1.prisma.employee.update({
            where: { id: req.params.id },
            data: {
                name: name ?? existing.name,
                nameAr: nameAr ?? existing.nameAr,
                photo: photo ?? existing.photo,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update employee.' });
    }
};
exports.updateEmployee = updateEmployee;
// DELETE employee
const deleteEmployee = async (req, res) => {
    try {
        const reservationsCount = await client_1.prisma.reservation.count({
            where: { employeeId: req.params.id },
        });
        if (reservationsCount > 0) {
            return res.status(409).json({
                error: 'Cannot delete employee with existing reservations.',
            });
        }
        await client_1.prisma.employee.delete({ where: { id: req.params.id } });
        res.json({ message: 'Employee deleted.' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete employee.' });
    }
};
exports.deleteEmployee = deleteEmployee;
// GET employee photo
const getEmployeePhoto = async (req, res) => {
    try {
        const employee = await client_1.prisma.employee.findUnique({
            where: { id: req.params.id },
            select: { photo: true },
        });
        if (!employee || !employee.photo) {
            return res.status(404).send('No photo found');
        }
        res.set('Content-Type', 'image/jpeg'); // or image/png
        res.send(employee.photo);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve photo.' });
    }
};
exports.getEmployeePhoto = getEmployeePhoto;
