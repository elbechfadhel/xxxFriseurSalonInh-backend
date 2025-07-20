import express from 'express';
import { createReservation, getAllReservations } from '../controllers/reservationController';
import {verifyAdmin} from "../middleware/auth";

const router = express.Router();

router.post('/', createReservation);
router.get('/', verifyAdmin, getAllReservations);


export default router;
