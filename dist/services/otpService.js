"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.maskPhone = maskPhone;
exports.generateCode = generateCode;
exports.canResend = canResend;
exports.createOrRefreshOtp = createOrRefreshOtp;
exports.verifyOtpCode = verifyOtpCode;
exports.purgeExpiredOtps = purgeExpiredOtps;
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const TTL_MIN = Number(process.env.OTP_TTL_MINUTES ?? 10);
const RESEND_S = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const LOCK_MIN = Number(process.env.OTP_LOCK_MINUTES ?? 15);
function normalizePhone(raw) {
    let p = raw.trim().replace(/[()\s-]/g, "");
    if (!p.startsWith("+")) {
        if (p.startsWith("0"))
            p = p.slice(1);
        p = "+49" + p;
    }
    return p;
}
function maskPhone(p) {
    return p.replace(/^(\+\d{2})\d+(\d{2})$/, "$1******$2");
}
function generateCode() {
    // RNG crypto, 6 chiffres
    return (crypto_1.default.randomInt(100000, 1000000)).toString();
}
async function canResend(phone) {
    const row = await prisma.phoneOtp.findUnique({ where: { phone } });
    if (!row)
        return true;
    const diff = (Date.now() - row.lastSentAt.getTime()) / 1000;
    return diff >= RESEND_S;
}
async function createOrRefreshOtp(phone, code) {
    const codeHash = await argon2_1.default.hash(code, { type: argon2_1.default.argon2id });
    const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);
    const now = new Date();
    // 1 seule ligne par téléphone
    return prisma.phoneOtp.upsert({
        where: { phone },
        create: {
            phone, codeHash, expiresAt,
            attempts: 0, lockedUntil: null, lastSentAt: now,
        },
        update: {
            codeHash, expiresAt,
            attempts: 0, lockedUntil: null, lastSentAt: now,
        }
    });
}
async function verifyOtpCode(phone, userCode) {
    const row = await prisma.phoneOtp.findUnique({ where: { phone } });
    if (!row)
        return { ok: false, reason: "no_code" };
    const now = Date.now();
    if (row.lockedUntil && now < row.lockedUntil.getTime()) {
        return { ok: false, reason: "locked", lockedUntil: row.lockedUntil };
    }
    if (now > row.expiresAt.getTime()) {
        // supprimer à l’expiration
        await prisma.phoneOtp.delete({ where: { phone } });
        return { ok: false, reason: "expired" };
    }
    const valid = await argon2_1.default.verify(row.codeHash, userCode);
    if (!valid) {
        const attempts = row.attempts + 1;
        let lockedUntil = row.lockedUntil;
        if (attempts >= MAX_ATTEMPTS) {
            lockedUntil = new Date(now + LOCK_MIN * 60 * 1000);
        }
        await prisma.phoneOtp.update({
            where: { phone },
            data: { attempts, lockedUntil },
        });
        return { ok: false, reason: lockedUntil ? "locked" : "invalid", lockedUntil };
    }
    // succès → supprimer la ligne
    await prisma.phoneOtp.delete({ where: { phone } });
    return { ok: true };
}
/** Nettoyage périodique (utile si bcp de trafic) */
async function purgeExpiredOtps() {
    await prisma.phoneOtp.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
}
