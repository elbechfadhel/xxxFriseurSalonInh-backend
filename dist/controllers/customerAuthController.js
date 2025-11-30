"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerChangePassword = exports.customerUpdate = exports.customerMe = exports.customerLogin = exports.customerRegister = exports.precheckRegistration = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../prisma/client");
const smsVerified_1 = require("../middleware/smsVerified");
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
function signCustomerToken(customerId) {
    return jsonwebtoken_1.default.sign({ sub: customerId, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
}
/** ---------- Registration precheck (email/phone duplicates) ---------- **/
const precheckRegistration = async (req, res) => {
    const { email, phoneE164 } = req.body;
    if (!email || !phoneE164)
        return res.status(400).json({ error: 'email and phoneE164 required' });
    const [byEmail, byPhone] = await Promise.all([
        client_1.prisma.customer.findUnique({ where: { email } }),
        client_1.prisma.customer.findUnique({ where: { phoneE164 } }),
    ]);
    if (byEmail)
        return res.status(409).json({ error: 'Email already in use' });
    if (byPhone)
        return res.status(409).json({ error: 'Phone already in use' });
    return res.json({ ok: true });
};
exports.precheckRegistration = precheckRegistration;
/** ------------------------- Register (with OTP) ------------------------- **/
const customerRegister = async (req, res) => {
    try {
        const { email, password, name, phoneE164, otpToken } = req.body;
        if (!email || !password || !name || !phoneE164 || !otpToken) {
            return res.status(400).json({ error: 'Missing fields (email, password, name, phoneE164, otpToken)' });
        }
        // 1) Verify OTP proof
        let decoded;
        try {
            decoded = (0, smsVerified_1.verifyOtpVerified)(otpToken); // { phoneE164, purpose?: string, iat, exp }
        }
        catch {
            return res.status(401).json({ error: 'Invalid or expired OTP token' });
        }
        if (decoded.phoneE164 !== phoneE164) {
            return res.status(400).json({ error: 'Phone mismatch' });
        }
        // 2) Uniqueness guards
        const [byEmail, byPhone] = await Promise.all([
            client_1.prisma.customer.findUnique({ where: { email } }),
            client_1.prisma.customer.findUnique({ where: { phoneE164 } }),
        ]);
        if (byEmail)
            return res.status(409).json({ error: 'Email already in use' });
        if (byPhone)
            return res.status(409).json({ error: 'Phone already in use' });
        // 3) Create customer with verified phone
        const passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
        const customer = await client_1.prisma.customer.create({
            data: { email, passwordHash, name, phoneE164, phoneVerified: true },
        });
        // 4) Issue login token
        const token = signCustomerToken(customer.id);
        const { passwordHash: _ph, ...safe } = customer;
        return res.status(201).json({ token, customer: safe });
    }
    catch (e) {
        if (e.code === 'P2002')
            return res.status(409).json({ error: 'Email or phone already in use' });
        return res.status(500).json({ error: 'Registration failed' });
    }
};
exports.customerRegister = customerRegister;
/** ----------------------------- Login ----------------------------- **/
const customerLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Missing credentials' });
    const customer = await client_1.prisma.customer.findUnique({ where: { email } });
    if (!customer)
        return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcryptjs_1.default.compare(password, customer.passwordHash);
    if (!ok)
        return res.status(401).json({ error: 'Invalid email or password' });
    const token = signCustomerToken(customer.id);
    const { passwordHash, ...safe } = customer;
    return res.json({ token, customer: safe });
};
exports.customerLogin = customerLogin;
/** ----------------------------- Me ----------------------------- **/
const customerMe = async (req, res) => {
    // prefer ID from auth middleware (e.g., req.customerId)
    const id = req.customer?.id || req.customerId;
    if (!id)
        return res.status(401).json({ error: 'Unauthorized' });
    const c = await client_1.prisma.customer.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, phoneE164: true, phoneVerified: true, createdAt: true },
    });
    if (!c)
        return res.status(404).json({ error: 'Not found' });
    res.json(c);
};
exports.customerMe = customerMe;
/** ------------------------- Update name/phone ------------------------- **/
const customerUpdate = async (req, res) => {
    try {
        const id = req.customer?.id || req.customerId;
        if (!id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { name, phoneE164, otpToken } = req.body;
        // If phone is being updated, require otpToken and verify it matches
        if (phoneE164) {
            if (!otpToken)
                return res.status(400).json({ error: 'otpToken required for phone update' });
            let decoded;
            try {
                decoded = (0, smsVerified_1.verifyOtpVerified)(otpToken); // { phoneE164, purpose?: 'phone_update' }
            }
            catch {
                return res.status(401).json({ error: 'Invalid or expired OTP token' });
            }
            if (decoded.phoneE164 !== phoneE164) {
                return res.status(400).json({ error: 'Phone mismatch' });
            }
            // (optional) enforce purpose
            if (decoded.purpose && decoded.purpose !== 'phone_update') {
                return res.status(400).json({ error: 'OTP purpose mismatch' });
            }
        }
        const updated = await client_1.prisma.customer.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(phoneE164
                    ? { phoneE164, phoneVerified: true } // set verified=true because OTP was checked
                    : {}),
            },
            select: { id: true, email: true, name: true, phoneE164: true, phoneVerified: true, createdAt: true },
        });
        res.json(updated);
    }
    catch (e) {
        if (e.code === 'P2002')
            return res.status(409).json({ error: 'Phone already in use' });
        res.status(500).json({ error: 'Update failed' });
    }
};
exports.customerUpdate = customerUpdate;
/** ------------------------- Change password ------------------------- **/
const customerChangePassword = async (req, res) => {
    try {
        const id = req.customer?.id || req.customerId;
        if (!id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Missing currentPassword or newPassword' });
        }
        const customer = await client_1.prisma.customer.findUnique({ where: { id } });
        if (!customer)
            return res.status(404).json({ error: 'Not found' });
        const ok = await bcryptjs_1.default.compare(currentPassword, customer.passwordHash);
        if (!ok)
            return res.status(401).json({ error: 'Invalid current password' });
        const passwordHash = await bcryptjs_1.default.hash(newPassword, BCRYPT_ROUNDS);
        await client_1.prisma.customer.update({ where: { id }, data: { passwordHash } });
        return res.json({ success: true });
    }
    catch (e) {
        return res.status(500).json({ error: 'Failed to change password' });
    }
};
exports.customerChangePassword = customerChangePassword;
