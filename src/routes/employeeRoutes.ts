import express from 'express';
import { getAllEmployees } from '../controllers/employeeController';

const router = express.Router();

router.get('/', getAllEmployees);

export default router;
