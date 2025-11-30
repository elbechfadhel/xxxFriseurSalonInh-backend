"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reservationController_1 = require("../controllers/reservationController");
const availabilityController_1 = require("../controllers/availabilityController");
const authCustomer_1 = require("../middleware/authCustomer");
const router = express_1.default.Router();
router.post('/', authCustomer_1.attachCustomerIfAny, reservationController_1.createReservation);
router.get('/', reservationController_1.getAllReservations);
router.get('/availability', availabilityController_1.getAvailabilityForDay);
router.delete('/:id', reservationController_1.deleteReservation);
router.put('/:id', reservationController_1.updateReservation);
exports.default = router;
