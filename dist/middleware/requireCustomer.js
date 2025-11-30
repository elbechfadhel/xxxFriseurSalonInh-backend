"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCustomer = requireCustomer;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireCustomer(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token)
            return res.status(401).json({ error: 'Unauthorized' });
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded?.sub)
            return res.status(401).json({ error: 'Unauthorized' });
        req.customerId = String(decoded.sub);
        next();
    }
    catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
