import { Router } from "express";
import { AdminController } from "../../../controllers/user/admin/Admin.controller";
import {
  authenticate,
  requireAdmin,
} from "../../../middlewares/auth.middleware";

const router = Router();
const adminController = new AdminController();

// 🎯 ROTAS PÚBLICAS - AUTENTICAÇÃO
router.post("/request-otp", adminController.requestOTP);
router.post("/verify-otp", adminController.verifyOTP);
router.post("/login", adminController.login);

// 🎯 ROTAS PROTEGIDAS - ADMIN ONLY
router.get("/profile", authenticate, requireAdmin, adminController.getProfile);
router.patch(
  "/profile",
  authenticate,
  requireAdmin,
  adminController.updateProfile
);

// 🎯 ROTAS DE ADMINISTRAÇÃO DO SISTEMA
router.get(
  "/system-stats",
  authenticate,
  requireAdmin,
  adminController.getSystemStats
);
router.get("/users", authenticate, requireAdmin, adminController.getAllUsers);
router.get(
  "/users/:userId",
  authenticate,
  requireAdmin,
  adminController.getUserById
);

// 🎯 GESTÃO DE USUÁRIOS
router.patch(
  "/manage-user/:userId",
  authenticate,
  requireAdmin,
  adminController.manageUser
);
router.patch(
  "/users/:userId/status",
  authenticate,
  requireAdmin,
  adminController.updateUserStatus
);
router.delete(
  "/users/:userId",
  authenticate,
  requireAdmin,
  adminController.deleteUser
);

// 🎯 REGISTRO DE NOVOS ADMINS (apenas super-admin)
router.post("/register", authenticate, requireAdmin, adminController.register);

// 🎯 BACKUP E MANUTENÇÃO
router.get("/backup", authenticate, requireAdmin, adminController.createBackup);
router.get("/logs", authenticate, requireAdmin, adminController.getSystemLogs);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "admin",
    status: "healthy",
    timestamp: new Date().toISOString(),
    features: [
      "system-stats",
      "user-management",
      "backup-ops",
      "system-logs",
      "otp-verification",
    ],
  });
});

export default router;
