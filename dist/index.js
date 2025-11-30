"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const reservationRoutes_1 = __importDefault(require("./routes/reservationRoutes"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const verifyEmailRoutes_1 = __importDefault(require("./routes/verifyEmailRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const feedbackRoutes_1 = __importDefault(require("./routes/feedbackRoutes"));
const verifyPhoneRoutes_1 = __importDefault(require("./routes/verifyPhoneRoutes"));
const otpService_1 = require("./services/otpService");
const customerAuthRoutes_1 = __importDefault(require("./routes/customerAuthRoutes"));
const resetPasswordRoutes_1 = __importDefault(require("./routes/resetPasswordRoutes"));
const myReservationsRoutes_1 = __importDefault(require("./routes/myReservationsRoutes"));
const smsLogRoutes_1 = __importDefault(require("./routes/smsLogRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// ✅ Make Express trust the first proxy (needed for Render/Heroku/etc.)
app.set("trust proxy", 1);
// 🔒 Basic security
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 📂 Serve uploaded images
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// 🌐 Global rate limit (prevent API abuse)
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // max 300 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
}));
// ✅ API routes
app.use("/api/reservations", reservationRoutes_1.default);
app.use("/api/employees", employeeRoutes_1.default);
app.use("/api/sms-logs", smsLogRoutes_1.default);
app.use("/api/verify-email", verifyEmailRoutes_1.default);
app.use("/api/admin", authRoutes_1.default);
app.use("/api/feedback", feedbackRoutes_1.default);
app.use("/api/verify-phone", verifyPhoneRoutes_1.default);
app.use('/api/auth/customer', customerAuthRoutes_1.default); // /auth/customer/register|login|me
app.use('/api/auth/customer', resetPasswordRoutes_1.default);
app.use('/api/auth/customer', myReservationsRoutes_1.default);
// 🧹 Purge expired OTPs every 10 minutes
setInterval(() => {
    (0, otpService_1.purgeExpiredOtps)().catch((e) => console.error("purge OTP error:", e));
}, 10 * 60 * 1000);
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
