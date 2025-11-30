"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/resetPasswordRoutes.ts
const express_1 = __importDefault(require("express"));
const resetPasswordController_1 = require("../controllers/resetPasswordController");
const router = express_1.default.Router();
// POST /api/auth/customer/reset-password
router.post('/reset-password', resetPasswordController_1.resetPassword);
exports.default = router;
