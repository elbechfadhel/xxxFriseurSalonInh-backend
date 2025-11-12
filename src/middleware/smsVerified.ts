import jwt from 'jsonwebtoken';

const OTP_SECRET = process.env.OTP_VERIFIED_SECRET!;

export function signOtpVerified(payload: { phoneE164: string }) {
    // short-lived proof; adjust as you like
    return jwt.sign(payload, OTP_SECRET, { expiresIn: '15m' });
}

export function verifyOtpVerified(token: string): { phoneE164: string } {
    return jwt.verify(token, OTP_SECRET) as { phoneE164: string };
}
