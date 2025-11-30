"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signOtpVerified = signOtpVerified;
exports.verifyOtpVerified = verifyOtpVerified;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const OTP_SECRET = process.env.OTP_VERIFIED_SECRET;
function signOtpVerified(payload) {
    // short-lived proof; adjust as you like
    return jsonwebtoken_1.default.sign(payload, OTP_SECRET, { expiresIn: '15m' });
}
function verifyOtpVerified(token) {
    return jsonwebtoken_1.default.verify(token, OTP_SECRET);
}
