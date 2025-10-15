import { Router } from "express";
import { AuthController } from "../../controllers/auth/Auth.controller";

const router = Router();
const authController = new AuthController();

// ✅ AUTENTICAÇÃO BÁSICA
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

// ✅ RECUPERAÇÃO DE SENHA
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// 🎯 VERIFICAÇÃO DE TOKEN
router.post("/verify-token", authController.verifyToken);
router.post("/verify-reset-token", authController.verifyResetToken);

// 🎯 VERIFICAÇÃO DE EMAIL (OTP)
router.post("/send-verification", authController.sendVerification);
router.post("/verify-account", authController.verifyAccount);

// 🎯 VERIFICAÇÃO DE DISPONIBILIDADE DE EMAIL (NOVA ROTA)
router.post("/check-email", authController.checkEmailAvailability);

// 🎯 GERENCIAMENTO DE SESSÕES
router.get("/session", authController.getSession);
router.get("/active-sessions", authController.getActiveSessions);
router.delete("/revoke-session/:sessionId", authController.revokeSession);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "auth",
    status: "healthy",
    timestamp: new Date().toISOString(),
    features: [
      "login",
      "refresh-token",
      "logout",
      "forgot-password",
      "reset-password",
      "token-verification",
      "email-verification",
      "email-availability-check",
      "session-management",
    ],
  });
});

export default router;
