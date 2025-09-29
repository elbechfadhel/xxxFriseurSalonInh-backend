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

type Lang = "de" | "en";

const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY as string,
    apiSecret: process.env.VONAGE_API_SECRET as string,
});

const FROM = (process.env.VONAGE_FROM || "").trim(); // MUST be numeric for DE
const USE_ASCII_SMS = process.env.USE_ASCII_SMS === "true";
const DEBUG_SMS_DETAILS = process.env.DEBUG_SMS_DETAILS === "true"; // <— add this in .env for debugging
/*const NODE_ENV = process.env.NODE_ENV || "development";*/

function getLang(req: Request): Lang {
    const raw = (req.body?.lang ?? req.query?.lang ?? "de").toString().toLowerCase();
    return raw === "en" ? "en" : "de";
}

function isE164Numeric(v: string) {
    // +<countrycode><number>, all digits after the +
    return /^\+[1-9]\d{6,15}$/.test(v);
}

function isLikelyAlphaSender(v: string) {
    // anything that isn't just digits (and optional +) is suspect for DE
    return /\D/.test(v.replace(/^\+/, ""));
}

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
        if (USE_ASCII_SMS) {
            return `${code} ist Ihr BarbaChop Bestaetigungscode. Gueltig ${minutes} Minuten. Bitte nicht weitergeben.`;
        } else {
            return `${code} ist Ihr BarbaChop Bestätigungscode. Gültig ${minutes} Minuten. Bitte nicht weitergeben.`;
        }
    },
};

// --- Common env preflight (runs once on import) ------------------------------
(() => {
    if (!FROM) {
        console.error("[OTP] VONAGE_FROM is not set! Requests will fail.");
    } else {
        if (!isE164Numeric(FROM)) {
            // In DE, alphanumeric sender IDs are often blocked.
            console.warn(
                `[OTP] VONAGE_FROM="${FROM}" is not an E.164 numeric sender. ` +
                "Germany may block alphanumeric senders. Prefer a Vonage virtual number like +49XXXXXXXXX."
            );
        }
    }
})();

// ---- Controllers ------------------------------------------------------------

export async function startSmsVerification(req: Request, res: Response) {
    const lang = getLang(req);
    const { phone } = req.body ?? {};
    if (!phone) return res.status(400).json({ error: M.needPhone[lang] });

    const to = normalizePhone(String(phone));

    // Fail early if FROM is bad
    if (!FROM) {
        const msg = "VONAGE_FROM missing";
        console.error("[OTP] Preflight failed:", msg);
        return res.status(500).json({
            error: M.sendFail[lang],
            ...(DEBUG_SMS_DETAILS ? { details: msg } : {}),
        });
    }

    if (isLikelyAlphaSender(FROM)) {
        console.warn(
            `[OTP] Using potentially invalid sender for DE: "${FROM}". Consider switching to a numeric E.164 virtual number.`
        );
    }

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
            clientRef: `otp:${to}:${Date.now()}`,
        };
        if (needsUnicode) params.type = "unicode";

        console.log("[OTP] Sending SMS via Vonage:", {
            to,
            from: FROM,
            unicode: needsUnicode,
            ascii: USE_ASCII_SMS,
            lang,
        });

        const resp = await vonage.sms.send(params);

// Support both kebab-case and camelCase fields
        const msg = Array.isArray((resp as any)?.messages) ? (resp as any).messages[0] : null;
        const status = (msg?.status ?? (msg as any)?.Status) as string | undefined;
        const errorText =
            (msg as any)?.['error-text'] ??
            (msg as any)?.errorText ??
            (msg as any)?.ErrorText;

        const ok = status === '0';

        if (!ok) {
            console.error('Vonage send not OK:', {
                status,
                errorText,
                to: (msg as any)?.to,
                network: (msg as any)?.network,
                clientRef: params.clientRef,
                fromUsed: params.from,
                type: params.type || 'text',
            });
            return res.status(500).json({
                error: M.sendFail[lang],
                ...(DEBUG_SMS_DETAILS ? { details: errorText || `status=${status}` } : {}),
            });
        }


        console.log(
            `[OTP] sent to ${maskPhone(to)} (lang=${lang}, ttl=${ttl}m, ascii=${USE_ASCII_SMS}, unicode=${needsUnicode})`
        );
        return res.json({ success: true, message: M.sentOk[lang] });
    } catch (e: any) {
        const details = e?.response?.data || e?.data || e?.message || e;
        console.error("Vonage SMS error (exception):", details);
        return res.status(500).json({
            error: M.sendFail[lang],
            ...(DEBUG_SMS_DETAILS ? { details: typeof details === "string" ? details : JSON.stringify(details) } : {}),
        });
    }
}

export async function checkSmsVerification(req: Request, res: Response) {
    const lang = getLang(req);
    const { phone, code } = req.body ?? {};
    const to = normalizePhone(String(phone ?? ""));
    const userCode = String(code ?? "").trim();

    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

    const result = await verifyOtpCode(to, userCode);

    if (result.ok) {
        console.log(`[OTP] verified for ${maskPhone(to)}`);
        return res.json({ success: true, message: M.confirmOk[lang] });
    }

    if (result.reason === "locked") {
        console.warn(`[OTP] locked ${maskPhone(to)}`);
        return res.status(429).json({ error: M.locked[lang] });
    }

    console.warn(`[OTP] failed (${result.reason}) for ${maskPhone(to)}`);
    return res.status(400).json({ error: M.invalidOrExpired[lang] });
}
