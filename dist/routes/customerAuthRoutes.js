"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerAuthController_1 = require("../controllers/customerAuthController");
const authCustomer_1 = require("../middleware/authCustomer");
const router = express_1.default.Router();
// customer auth lives under /auth/customer/*
router.post('/register', customerAuthController_1.customerRegister);
router.post('/login', customerAuthController_1.customerLogin);
router.get('/me', authCustomer_1.requireCustomer, customerAuthController_1.customerMe);
router.patch('/me', authCustomer_1.requireCustomer, customerAuthController_1.customerUpdate);
router.post('/register/precheck', customerAuthController_1.precheckRegistration);
router.post('/change-password', authCustomer_1.requireCustomer, customerAuthController_1.customerChangePassword);
exports.default = router;
