// src/routes/verifyEmailRoutes.ts
import express from 'express';
import { sendCode, confirmCode } from '../controllers/verifyEmailController';

const router = express.Router();

router.post('/send-code', sendCode);
router.post('/confirm-code', confirmCode);

export default router;
