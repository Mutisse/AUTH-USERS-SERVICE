import { Router } from "express";
import { SessionController } from "../../controllers/session/Session.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
const sessionController = new SessionController();

// 🎯 TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
router.use(authenticate);

// 🎯 GERENCIAMENTO DE SESSÕES
router.get("/active", sessionController.getActiveSessions);
router.get("/history", sessionController.getSessionHistory);
router.get("/stats", sessionController.getSessionStats);
router.delete("/terminate/:sessionId", sessionController.terminateSession);
router.delete("/terminate-all", sessionController.terminateAllSessions);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "session",
    status: "healthy",
    timestamp: new Date().toISOString(),
    features: [
      "session-tracking",
      "activity-monitoring",
      "device-tracking",
      "session-management",
    ],
  });
});

export default router;
