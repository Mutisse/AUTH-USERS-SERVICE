import { Router } from "express";
import { OTPController } from "../../controllers/otp/OTP.controller"; // ✅ CAMINHO CORRETO
import { otpRateLimit } from "../../middlewares/otp.middleware";

const router = Router();
const otpController = new OTPController();

// 🎯 ROTAS PÚBLICAS OTP
router.post("/send", otpRateLimit, otpController.sendOTP);
router.post("/verify", otpController.verifyOTP);
router.post("/resend", otpRateLimit, otpController.resendOTP);
router.get("/status/:email", otpController.getStatus);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "otp",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router; // ✅ CORRIGIDO - tinha 'export d' no final