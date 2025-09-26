import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";

const prisma = new PrismaClient();

const TTL_MIN = Number(process.env.OTP_TTL_MINUTES ?? 10);
const RESEND_S = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const LOCK_MIN = Number(process.env.OTP_LOCK_MINUTES ?? 15);

export function normalizePhone(raw: string): string {
    let p = raw.trim().replace(/[()\s-]/g, "");
    if (!p.startsWith("+")) {
        if (p.startsWith("0")) p = p.slice(1);
        p = "+49" + p;
    }
    return p;
}

export function maskPhone(p: string) {
    return p.replace(/^(\+\d{2})\d+(\d{2})$/, "$1******$2");
}

export function generateCode() {
    // RNG crypto, 6 chiffres
    return (crypto.randomInt(100000, 1000000)).toString();
}

export async function canResend(phone: string) {
    const row = await prisma.phoneOtp.findUnique({ where: { phone } });
    if (!row) return true;
    const diff = (Date.now() - row.lastSentAt.getTime()) / 1000;
    return diff >= RESEND_S;
}

export async function createOrRefreshOtp(phone: string, code: string) {
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });
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

export async function verifyOtpCode(phone: string, userCode: string) {
    const row = await prisma.phoneOtp.findUnique({ where: { phone } });
    if (!row) return { ok: false, reason: "no_code" as const };

    const now = Date.now();

    if (row.lockedUntil && now < row.lockedUntil.getTime()) {
        return { ok: false, reason: "locked" as const, lockedUntil: row.lockedUntil };
    }
    if (now > row.expiresAt.getTime()) {
        // supprimer à l’expiration
        await prisma.phoneOtp.delete({ where: { phone } });
        return { ok: false, reason: "expired" as const };
    }

    const valid = await argon2.verify(row.codeHash, userCode);
    if (!valid) {
        const attempts = row.attempts + 1;
        let lockedUntil: Date | null = row.lockedUntil;
        if (attempts >= MAX_ATTEMPTS) {
            lockedUntil = new Date(now + LOCK_MIN * 60 * 1000);
        }
        await prisma.phoneOtp.update({
            where: { phone },
            data: { attempts, lockedUntil },
        });
        return { ok: false, reason: lockedUntil ? "locked" as const : "invalid" as const, lockedUntil };
    }

    // succès → supprimer la ligne
    await prisma.phoneOtp.delete({ where: { phone } });
    return { ok: true as const };
}

/** Nettoyage périodique (utile si bcp de trafic) */
export async function purgeExpiredOtps() {
    await prisma.phoneOtp.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
}
