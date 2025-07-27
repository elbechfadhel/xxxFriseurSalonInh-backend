import express from 'express';
import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} from '../controllers/employeeController';
import { upload } from '../middleware/upload';

const router = express.Router();

// Get all employees
router.get('/', getAllEmployees);

// Get single employee
router.get('/:id', getEmployeeById);

// Create employee (with optional photo upload)
router.post('/', upload.single('photo'), createEmployee);

// Update employee (with optional photo upload)
router.put('/:id', upload.single('photo'), updateEmployee);

// Delete employee
router.delete('/:id', deleteEmployee);

export default router;
