// src/routes/myReservationsRoutes.ts
import express from 'express';
import { requireCustomer } from '../middleware/requireCustomer';
import { getMyReservations, cancelMyReservation } from '../controllers/myReservationsController';

const router = express.Router();
router.use(requireCustomer);

router.get('/my-reservations', getMyReservations);
router.delete('/my-reservations/:id', cancelMyReservation);

export default router;
