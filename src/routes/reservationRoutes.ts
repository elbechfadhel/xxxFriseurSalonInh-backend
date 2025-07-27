import express from 'express';
import {
    createReservation,
    deleteReservation,
    getAllReservations,
    updateReservation
} from '../controllers/reservationController';

const router = express.Router();

router.post('/', createReservation);
router.get('/', getAllReservations);
router.delete('/:id', deleteReservation);
router.put('/:id', updateReservation);


export default router;
