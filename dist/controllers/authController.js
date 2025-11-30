"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const adminLogin = (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = jsonwebtoken_1.default.sign({ role: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });
    res.json({ token });
};
exports.adminLogin = adminLogin;
