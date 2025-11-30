"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCustomer = requireCustomer;
exports.attachCustomerIfAny = attachCustomerIfAny;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../prisma/client");
const JWT_SECRET = process.env.JWT_SECRET;
async function requireCustomer(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token)
            return res.status(401).json({ error: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== 'customer')
            return res.status(401).json({ error: 'Wrong token role' });
        const customer = await client_1.prisma.customer.findUnique({ where: { id: decoded.sub } });
        if (!customer)
            return res.status(401).json({ error: 'Invalid token' });
        req.customer = customer;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
// “Soft” variant: attach customer if present; don’t fail if absent
async function attachCustomerIfAny(req, _res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) {
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== 'customer') {
            return next();
        }
        const customer = await client_1.prisma.customer.findUnique({ where: { id: decoded.sub } });
        if (customer) {
            req.customer = customer;
        }
        return next();
    }
    catch (err) {
        console.warn('attachCustomerIfAny: ignoring invalid token', err);
        return next();
    }
}
