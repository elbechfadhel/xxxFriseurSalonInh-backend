"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSmsVerification = startSmsVerification;
exports.checkSmsVerification = checkSmsVerification;
const server_sdk_1 = require("@vonage/server-sdk");
const otpService_1 = require("../services/otpService");
const smsVerified_1 = require("../middleware/smsVerified");
const client_1 = require("../prisma/client");
const vonage = new server_sdk_1.Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET,
});
const FROM = process.env.VONAGE_FROM;
function getLang(req) {
    const raw = (req.body?.lang ?? req.query?.lang ?? "de").toString().toLowerCase();
    return raw === "en" ? "en" : "de";
}
const USE_ASCII_SMS = process.env.USE_ASCII_SMS === "true";
const M = {
    needPhone: { de: "Telefonnummer ist erforderlich", en: "Phone is required" },
    sentOk: { de: "Code wurde per SMS gesendet", en: "Code sent via SMS" },
    sendFail: { de: "SMS konnte nicht gesendet werden", en: "Failed to send SMS" },
    coolDown: {
        de: "Bitte warte kurz, bevor du einen neuen Code anforderst.",
        en: "Please wait before requesting a new code.",
    },
    locked: {
        de: "Zu viele Fehlversuche. Bitte später erneut versuchen.",
        en: "Too many attempts. Please try again later.",
    },
    invalidOrExpired: {
        de: "Code ungültig oder abgelaufen.",
        en: "Code invalid or expired.",
    },
    confirmOk: { de: "Code bestätigt", en: "Code verified" },
    smsBody: (lang, code, minutes) => {
        if (lang === "en") {
            return `${code} is your XXXFriseursalon verification code. Valid for ${minutes} minutes. Do not share it.`;
        }
        // 🇩🇪 Allemand
        if (USE_ASCII_SMS) {
            return `${code} ist Ihr XXXFriseursalon Bestaetigungscode. Gueltig ${minutes} Minuten. Bitte nicht weitergeben.`;
        }
        else {
            return `${code} ist Ihr XXXFriseursalon Bestätigungscode. Gültig ${minutes} Minuten. Bitte nicht weitergeben.`;
        }
    },
};
// ---- Controllers ------------------------------------------------------------
async function startSmsVerification(req, res) {
    const lang = getLang(req);
    const { phone } = req.body ?? {};
    if (!phone)
        return res.status(400).json({ error: M.needPhone[lang] });
    const to = (0, otpService_1.normalizePhone)(String(phone));
    if (!(await (0, otpService_1.canResend)(to))) {
        return res.status(429).json({ error: M.coolDown[lang] });
    }
    const code = (0, otpService_1.generateCode)();
    await (0, otpService_1.createOrRefreshOtp)(to, code);
    try {
        const ttl = Number(process.env.OTP_TTL_MINUTES ?? 10);
        const text = M.smsBody(lang, code, ttl);
        const needsUnicode = !USE_ASCII_SMS && /[^\x00-\x7F]/.test(text);
        const params = {
            to,
            from: FROM,
            text,
            clientRef: `otp:${to}:${Date.now()}`,
        };
        if (needsUnicode)
            params.type = "unicode";
        const resp = await vonage.sms.send(params);
        // treat msg as any to support both "error-text" and errorText
        const msg = Array.isArray(resp.messages) ? resp.messages[0] : undefined;
        const ok = msg?.status === "0";
        const errorText = ok ? null : msg?.["error-text"] ?? msg?.errorText ?? "Unknown Vonage error";
        // ---- Log SMS attempt ----
        await client_1.prisma.smsLog.create({
            data: {
                to,
                status: ok ? "ok" : "error",
                errorText,
            },
        });
        if (!ok) {
            console.error("Vonage send not OK:", resp);
            return res.status(500).json({ error: M.sendFail[lang] });
        }
        console.log(`[OTP] sent to ${(0, otpService_1.maskPhone)(to)} (${lang}, ttl=${ttl}m, ascii=${USE_ASCII_SMS})`);
        return res.json({ success: true, message: M.sentOk[lang] });
    }
    catch (e) {
        console.error("Vonage SMS error:", e?.response?.data ?? e?.message ?? e);
        // ---- Log exception case ----
        await client_1.prisma.smsLog.create({
            data: {
                to,
                status: "exception",
                errorText: e?.message ?? "Unknown exception",
            },
        });
        return res.status(500).json({ error: M.sendFail[lang] });
    }
}
async function checkSmsVerification(req, res) {
    const lang = getLang(req);
    const { phone, code, purpose } = req.body ?? {}; // <-- add purpose
    const to = (0, otpService_1.normalizePhone)(String(phone ?? ""));
    const userCode = String(code ?? "").trim();
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    const result = await (0, otpService_1.verifyOtpCode)(to, userCode);
    if (result.ok) {
        console.log(`[OTP] verified for ${(0, otpService_1.maskPhone)(to)}`);
        // NEW: if used for registration, issue a short-lived proof token
        if (purpose === 'registration') {
            const token = (0, smsVerified_1.signOtpVerified)({ phoneE164: to });
            return res.json({ success: true, message: M.confirmOk[lang], otpToken: token });
        }
        // existing behavior for booking, etc.
        return res.json({ success: true, message: M.confirmOk[lang] });
    }
    if (result.reason === "locked") {
        console.warn(`[OTP] locked ${(0, otpService_1.maskPhone)(to)}`);
        return res.status(429).json({ error: M.locked[lang] });
    }
    console.warn(`[OTP] failed (${result.reason}) for ${(0, otpService_1.maskPhone)(to)}`);
    return res.status(400).json({ error: M.invalidOrExpired[lang] });
}
