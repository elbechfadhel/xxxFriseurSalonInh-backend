import express from 'express';
import { createReservation, getAllReservations } from '../controllers/reservationController';

const router = express.Router();

router.post('/', createReservation);
router.get('/', getAllReservations);

export default router;
