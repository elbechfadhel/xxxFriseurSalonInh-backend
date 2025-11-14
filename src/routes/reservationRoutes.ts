import express from 'express';
import {
    createReservation,
    deleteReservation,
    getAllReservations,
    updateReservation
} from '../controllers/reservationController';
import {getAvailabilityForDay} from "../controllers/availabilityController";
import { attachCustomerIfAny } from '../middleware/authCustomer';

const router = express.Router();
router.post('/', attachCustomerIfAny, createReservation);
router.get('/', getAllReservations);
router.get('/availability', getAvailabilityForDay)
router.delete('/:id', deleteReservation);
router.put('/:id', updateReservation);


export default router;
