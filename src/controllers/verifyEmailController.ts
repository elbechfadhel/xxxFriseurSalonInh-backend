// src/controllers/verifyEmailController.ts
import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

interface CodeEntry {
    code: string;
    expiresAt: number;
}

type Lang = 'de' | 'en';

const verificationStore: Record<string, CodeEntry> = {};

// ⚠️ Consider moving creds to env vars in production (GMAIL_USER / GMAIL_APP_PASSWORD)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'el.bech.fadhel@gmail.com',     // ✅ your Gmail
        pass: 'stqf lqby etkf orsl',          // ✅ your App Password
    },
});

// --- i18n helpers ------------------------------------------------------------

function getLang(req: Request): Lang {
    // Read from body.lang or query.lang; default to German
    const raw = (req.body?.lang ?? req.query?.lang ?? 'de').toString().toLowerCase();
    return raw === 'en' ? 'en' : 'de';
}

const M = {
    subject: {
        de: 'Ihr Bestätigungscode für die Buchung',
        en: 'Your Booking Confirmation Code',
    },
    emailText: (lang: Lang, code: string) =>
        lang === 'en'
            ? `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`
            : `Ihr Bestätigungscode lautet: ${code}\n\nDieser Code läuft in 10 Minuten ab.`,
    // API messages
    needEmail: {
        de: 'E-Mail-Adresse ist erforderlich',
        en: 'Email is required',
    },
    sentOk: {
        de: 'Code wurde gesendet',
        en: 'Code sent',
    },
    sendFail: {
        de: 'E-Mail konnte nicht gesendet werden',
        en: 'Failed to send email',
    },
    noCode: {
        de: 'Für diese E-Mail wurde kein Code gefunden',
        en: 'No code found for this email',
    },
    invalid: {
        de: 'Ungültiger Code',
        en: 'Invalid code',
    },
    expired: {
        de: 'Code ist abgelaufen',
        en: 'Code expired',
    },
    confirmOk: {
        de: 'Code bestätigt',
        en: 'Code verified',
    },
};

const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

// --- Controllers -------------------------------------------------------------

export const sendCode = async (req: Request, res: Response) => {
    const lang = getLang(req);
    const { email } = req.body ?? {};

    if (!email) {
        return res.status(400).json({ error: M.needEmail[lang] });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    verificationStore[normalizedEmail] = { code, expiresAt };

    try {
        await transporter.sendMail({
            from: '"Nejib Barber Shop" <el.bech.fadhel@gmail.com>', // ✅ fixed double @gmail.com
            to: normalizedEmail,
            subject: M.subject[lang],
            text: M.emailText(lang, code),
            // (optional) add HTML:
            // html: `<p>${M.emailText(lang, code).replace(/\n/g, '<br/>')}</p>`,
        });

        return res.json({ success: true, message: M.sentOk[lang] });
    } catch (error) {
        console.error('Email error:', error);
        return res.status(500).json({ error: M.sendFail[lang] });
    }
};

export const confirmCode = (req: Request, res: Response) => {
    const lang = getLang(req);
    const { email, code } = req.body ?? {};

    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const entry = verificationStore[normalizedEmail];

    if (!entry) {
        return res.status(400).json({ error: M.noCode[lang] });
    }

    if (entry.code !== String(code ?? '')) {
        return res.status(400).json({ error: M.invalid[lang] });
    }

    if (Date.now() > entry.expiresAt) {
        delete verificationStore[normalizedEmail];
        return res.status(400).json({ error: M.expired[lang] });
    }

    delete verificationStore[normalizedEmail];
    return res.json({ success: true, message: M.confirmOk[lang] });
};
