// src/controllers/verifyPhoneController.ts
import { Request, Response } from "express";
import { Vonage } from "@vonage/server-sdk";
import {
    normalizePhone,
    maskPhone,
    generateCode,
    canResend,
    createOrRefreshOtp,
    verifyOtpCode,
} from "../services/otpService";
import {signOtpVerified} from "../middleware/smsVerified";

type Lang = "de" | "en";

const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY as string,
    apiSecret: process.env.VONAGE_API_SECRET as string,
});
const FROM = process.env.VONAGE_FROM as string;

function getLang(req: Request): Lang {
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

    smsBody: (lang: Lang, code: string, minutes: number) => {
        if (lang === "en") {
            return `${code} is your BarbaChop verification code. Valid for ${minutes} minutes. Do not share it.`;
        }

        // 🇩🇪 Allemand
        if (USE_ASCII_SMS) {
            return `${code} ist Ihr BarbaChop Bestaetigungscode. Gueltig ${minutes} Minuten. Bitte nicht weitergeben.`;
        } else {
            return `${code} ist Ihr BarbaChop Bestätigungscode. Gültig ${minutes} Minuten. Bitte nicht weitergeben.`;
        }
    },
};

// ---- Controllers ------------------------------------------------------------

export async function startSmsVerification(req: Request, res: Response) {
    const lang = getLang(req);
    const { phone } = req.body ?? {};
    if (!phone) return res.status(400).json({ error: M.needPhone[lang] });

    const to = normalizePhone(String(phone));

    if (!(await canResend(to))) {
        return res.status(429).json({ error: M.coolDown[lang] });
    }

    const code = generateCode();
    await createOrRefreshOtp(to, code);

    try {
        const ttl = Number(process.env.OTP_TTL_MINUTES ?? 10);
        const text = M.smsBody(lang, code, ttl);
        const needsUnicode = !USE_ASCII_SMS && /[^\x00-\x7F]/.test(text);


        const params: any = {
            to,
            from: FROM,
            text,
            clientRef: `otp:${to}:${Date.now()}`
        };
        if (needsUnicode) params.type = "unicode";

        const resp = await vonage.sms.send(params);

        const ok =
            Array.isArray(resp.messages) && resp.messages.some((m: any) => m.status === "0");
        if (!ok) {
            console.error("Vonage send not OK:", resp);
            return res.status(500).json({ error: M.sendFail[lang] });
        }

        console.log(`[OTP] sent to ${maskPhone(to)} (${lang}, ttl=${ttl}m, ascii=${USE_ASCII_SMS})`);
        return res.json({ success: true, message: M.sentOk[lang] });
    } catch (e: any) {
        console.error("Vonage SMS error:", e?.response?.data ?? e?.message ?? e);
        return res.status(500).json({ error: M.sendFail[lang] });
    }
}

export async function checkSmsVerification(req: Request, res: Response) {
    const lang = getLang(req);
    const { phone, code, purpose } = req.body ?? {}; // <-- add purpose
    const to = normalizePhone(String(phone ?? ""));
    const userCode = String(code ?? "").trim();

    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

    const result = await verifyOtpCode(to, userCode);

    if (result.ok) {
        console.log(`[OTP] verified for ${maskPhone(to)}`);

        // NEW: if used for registration, issue a short-lived proof token
        if (purpose === 'registration') {
            const token = signOtpVerified({ phoneE164: to });
            return res.json({ success: true, message: M.confirmOk[lang], otpToken: token });
        }

        // existing behavior for booking, etc.
        return res.json({ success: true, message: M.confirmOk[lang] });
    }

    if (result.reason === "locked") {
        console.warn(`[OTP] locked ${maskPhone(to)}`);
        return res.status(429).json({ error: M.locked[lang] });
    }

    console.warn(`[OTP] failed (${result.reason}) for ${maskPhone(to)}`);
    return res.status(400).json({ error: M.invalidOrExpired[lang] });
}
