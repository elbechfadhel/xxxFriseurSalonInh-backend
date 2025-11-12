// src/routes/resetPasswordRoutes.ts
import express from 'express';
import { resetPassword } from '../controllers/resetPasswordController';

const router = express.Router();

// POST /api/auth/customer/reset-password
router.post('/reset-password', resetPassword);

export default router;
