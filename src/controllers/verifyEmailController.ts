// src/controllers/verifyEmailController.ts
import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import handlebars from 'handlebars';

interface CodeEntry {
    code: string;
    expiresAt: number;
}

type Lang = 'de' | 'en';

const verificationStore: Record<string, CodeEntry> = {};

// ✅ Move these to env vars in production
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER ?? 'el.bech.fadhel@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD ?? 'stqf lqby etkf orsl',
    },
});

// ---- i18n copy --------------------------------------------------------------

function getLang(req: Request): Lang {
    const raw = (req.body?.lang ?? req.query?.lang ?? 'de').toString().toLowerCase();
    return raw === 'en' ? 'en' : 'de';
}

const M = {
    subject: {
        de: 'Ihr Bestätigungscode für die Buchung',
        en: 'Your Booking Confirmation Code',
    },
    heading: {
        de: 'Bestätigungscode',
        en: 'Verification Code',
    },
    intro: (lang: Lang, minutes: number) =>
        lang === 'en'
            ? `Use the code below to confirm your booking. The code expires in ${minutes} minutes.`
            : `Nutzen Sie den folgenden Code, um Ihre Buchung zu bestätigen. Der Code läuft in ${minutes} Minuten ab.`,
    footer: {
        de: 'Vielen Dank für Ihre Buchung bei Nejib Barber Shop.',
        en: 'Thanks for booking with Nejib Barber Shop.',
    },
    plainText: (lang: Lang, code: string, minutes: number) =>
        lang === 'en'
            ? `Your verification code is: ${code}\nThis code expires in ${minutes} minutes.`
            : `Ihr Bestätigungscode lautet: ${code}\nDieser Code läuft in ${minutes} Minuten ab.`,
    // API messages
    needEmail: { de: 'E-Mail-Adresse ist erforderlich', en: 'Email is required' },
    sentOk:     { de: 'Code wurde gesendet',            en: 'Code sent' },
    sendFail:   { de: 'E-Mail konnte nicht gesendet werden', en: 'Failed to send email' },
    noCode:     { de: 'Für diese E-Mail wurde kein Code gefunden', en: 'No code found for this email' },
    invalid:    { de: 'Ungültiger Code',                en: 'Invalid code' },
    expired:    { de: 'Code ist abgelaufen',            en: 'Code expired' },
    confirmOk:  { de: 'Code bestätigt',                 en: 'Code verified' },
};

// ---- Template (inline Handlebars) ------------------------------------------
// You can move this into src/email/templates/verify.hbs later.
const TEMPLATE_SRC = `
<!doctype html>
<html lang="{{lang}}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{{subject}}</title>
  <style>
    body { margin:0; padding:0; background:#f6f7f9; font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111; }
    .wrapper { max-width:520px; margin:24px auto; padding:0 16px; }
    .card { background:#ffffff; border-radius:14px; box-shadow:0 1px 2px rgba(0,0,0,0.06); overflow:hidden; }
    .header { padding:20px 20px 0; text-align:center; }
    .logo { width:72px; height:auto; display:block; margin:0 auto 8px; }
    h1 { font-size:20px; margin:8px 0 12px; }
    p { margin:0 0 12px; line-height:1.45; color:#333; }
    .code { letter-spacing:3px; font-weight:800; font-size:28px; text-align:center; padding:16px 0; }
    .divider { height:1px; background:#eceef1; margin:8px 20px; }
    .content { padding:0 20px 20px; }
    .footer { font-size:12px; color:#6b7280; padding:12px 20px 18px; text-align:center; }
    @media (prefers-color-scheme: dark) {
      body { background:#0f1115; color:#e5e7eb; }
      .card { background:#111418; }
      .divider { background:#1f2937; }
      p { color:#e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <img class="logo" src="cid:{{logoCid}}" alt="Nejib Barber Shop" />
        <h1>{{heading}}</h1>
      </div>
      <div class="content">
        <p>{{intro}}</p>
        <div class="code">{{code}}</div>
      </div>
      <div class="divider"></div>
      <div class="footer">{{footer}}</div>
    </div>
  </div>
</body>
</html>
`;
const compileTemplate = handlebars.compile(TEMPLATE_SRC);

// Try to resolve your logo path for attachment
async function resolveLogoPath(): Promise<string | null> {
    const candidates = [
        path.resolve(process.cwd(), 'src/email/assets/logo.png'),
        path.resolve(process.cwd(), 'src/assets/logo.png'),
        path.resolve(process.cwd(), 'assets/logo.png'),
    ];
    for (const p of candidates) {
        try { await fs.access(p); return p; } catch {}
    }
    return null;
}

// ---- Code generation --------------------------------------------------------
const generateCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();

// ---- Controllers ------------------------------------------------------------

export const sendCode = async (req: Request, res: Response) => {
    const lang = getLang(req);
    const { email } = req.body ?? {};

    if (!email) return res.status(400).json({ error: M.needEmail[lang] });

    const normalizedEmail = String(email).trim().toLowerCase();
    const code = generateCode();
    const ttlMinutes = 10;
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

    verificationStore[normalizedEmail] = { code, expiresAt };

    // Build HTML + plain text
    const html = compileTemplate({
        lang,
        subject: M.subject[lang],
        heading: M.heading[lang],
        intro: M.intro(lang, ttlMinutes),
        code,
        footer: M.footer[lang],
        logoCid: 'logo@nejib', // must match the attachment cid
    });
    const text = M.plainText(lang, code, ttlMinutes);

    try {
        const logoPath = await resolveLogoPath();

        await transporter.sendMail({
            from: '"Nejib Barber Shop" <' + (process.env.GMAIL_USER ?? 'el.bech.fadhel@gmail.com') + '>',
            to: normalizedEmail,
            subject: M.subject[lang],
            text,
            html,
            attachments: logoPath
                ? [
                    {
                        filename: 'logo.png',
                        path: logoPath,
                        cid: 'logo@nejib', // inline image via cid
                    },
                ]
                : [],
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

    if (!entry) return res.status(400).json({ error: M.noCode[lang] });
    if (entry.code !== String(code ?? '')) return res.status(400).json({ error: M.invalid[lang] });

    if (Date.now() > entry.expiresAt) {
        delete verificationStore[normalizedEmail];
        return res.status(400).json({ error: M.expired[lang] });
    }

    delete verificationStore[normalizedEmail];
    return res.json({ success: true, message: M.confirmOk[lang] });
};
