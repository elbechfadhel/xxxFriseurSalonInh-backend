import express from 'express';
import {
    customerChangePassword,
    customerLogin,
    customerMe,
    customerRegister,
    customerUpdate,
    precheckRegistration
} from '../controllers/customerAuthController';
import { requireCustomer } from '../middleware/authCustomer';

const router = express.Router();

// customer auth lives under /auth/customer/*
router.post('/register', customerRegister);
router.post('/login', customerLogin);
router.get('/me', requireCustomer, customerMe);
router.patch('/me', requireCustomer, customerUpdate);
router.post('/register/precheck', precheckRegistration);
router.post('/change-password', requireCustomer, customerChangePassword);

export default router;
