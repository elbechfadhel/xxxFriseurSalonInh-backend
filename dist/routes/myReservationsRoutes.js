"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/myReservationsRoutes.ts
const express_1 = __importDefault(require("express"));
const requireCustomer_1 = require("../middleware/requireCustomer");
const myReservationsController_1 = require("../controllers/myReservationsController");
const router = express_1.default.Router();
router.use(requireCustomer_1.requireCustomer);
router.get('/my-reservations', myReservationsController_1.getMyReservations);
router.delete('/my-reservations/:id', myReservationsController_1.cancelMyReservation);
exports.default = router;
