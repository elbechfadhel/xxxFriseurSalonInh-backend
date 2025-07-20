// src/routes/verifySmsRoutes.ts
import express from 'express';
import { sendSmsCode, confirmSmsCode } from '../controllers/verifySmsController';

const router = express.Router();

router.post('/send-code', sendSmsCode);
router.post('/confirm-code', confirmSmsCode);

export default router;
