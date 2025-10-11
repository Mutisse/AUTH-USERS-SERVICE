import { Router } from "express";
import { AuthController } from "../../controllers/auth/Auth.controller";

const router = Router();
const authController = new AuthController();

// ✅ VERIFIQUE SE TODOS ESTES MÉTODOS EXISTEM NO AuthController
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// 🎯 VERIFICAÇÃO DE TOKEN
router.post("/verify-token", authController.verifyToken);
router.post("/verify-reset-token", authController.verifyResetToken); // ← LINHA 19 (PROVÁVEL ERRO)

// 🎯 VERIFICAÇÃO DE EMAIL
router.post("/send-verification", authController.sendVerification);
router.post("/verify-account", authController.verifyAccount);

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
      "session-management",
    ],
  });
});

export default router;
