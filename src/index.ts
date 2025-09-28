// src/index.ts
import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import reservationRoutes from "./routes/reservationRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import verifyEmailRoutes from "./routes/verifyEmailRoutes";
import authRoutes from "./routes/authRoutes";
import feedbackRoutesRoutes from "./routes/feedbackRoutes";
import verifyPhoneRoutes from "./routes/verifyPhoneRoutes";
import { purgeExpiredOtps } from "./services/otpService";

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Make Express trust the first proxy (needed for Render/Heroku/etc.)
app.set("trust proxy", 1);

// 🔒 Basic security
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());

// 📂 Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 🌐 Global rate limit (prevent API abuse)
app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300,                 // max 300 requests per IP
      standardHeaders: true,
      legacyHeaders: false,
    })
);

// ✅ API routes
app.use("/api/reservations", reservationRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/verify-email", verifyEmailRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/feedback", feedbackRoutesRoutes);
app.use("/api/verify-phone", verifyPhoneRoutes);

// 🧹 Purge expired OTPs every 10 minutes
setInterval(() => {
  purgeExpiredOtps().catch((e) => console.error("purge OTP error:", e));
}, 10 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
