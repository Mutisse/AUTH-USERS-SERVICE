// AUTH-USERS-SERVICE/src/routes/index.ts
import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/auth/Auth.controller";
import { SessionController } from "../controllers/session/Session.controller";
import { AdminController } from "../controllers/user/admin/Admin.controller";
import { ClientController } from "../controllers/user/client/Client.controller";
import { EmployeeController } from "../controllers/user/employee/Employee.controller";
import { EmailVerificationController } from "../controllers/verificy/email/EmailVerification.controller";
import { RegistrationCleanupController } from "../controllers/verificy/cleanup/RegistrationCleanup.controller";
import { userDiagnostic } from "../utils/diagnostics/diagnostic.utils";
import {
  authenticate,
  requireAdmin,
  requireClient,
  requireEmployee,
} from "../middlewares/auth.middleware";

const router = Router();

// ✅ INICIALIZAR CONTROLLERS
const authController = new AuthController();
const sessionController = new SessionController();
const adminController = new AdminController();
const clientController = new ClientController();
const employeeController = new EmployeeController();
const emailController = new EmailVerificationController();
const cleanupController = new RegistrationCleanupController();

// =============================================
// 🩺 HEALTH CHECKS & DIAGNOSTICS
// =============================================

router.get("/health", (req: Request, res: Response) => {
  res.json({
    service: "user-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.3.0",
    features: [
      "multi_user_registration",
      "otp_verification",
      "session_management",
      "email_verification",
      "admin_dashboard",
    ],
  });
});

router.get("/ping", (req: Request, res: Response) => {
  res.json({
    service: "user-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get(
  "/diagnostics/full",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const diagnostic = await userDiagnostic.fullDiagnostic();
      res.json(diagnostic);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/diagnostics/quick",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const diagnostic = await userDiagnostic.quickDiagnostic();
      res.json(diagnostic);
    } catch (error: any) {
      next(error);
    }
  }
);

// =============================================
// 🔐 AUTHENTICATION ROUTES (PUBLIC)
// =============================================

// ✅ REGISTRATION (COM next)
router.post(
  "/auth/start-registration",
  (req: Request, res: Response, next: NextFunction) => {
    authController.startRegistration(req, res, next);
  }
);

// ✅ LOGIN/LOGOUT (SEM next)
router.post("/auth/login", (req: Request, res: Response) =>
  authController.login(req, res)
);

router.post("/auth/logout", (req: Request, res: Response) =>
  authController.logout(req, res)
);

router.post("/auth/refresh-token", (req: Request, res: Response) =>
  authController.refreshToken(req, res)
);

// ✅ PASSWORD RECOVERY (SEM next)
router.post("/auth/forgot-password", (req: Request, res: Response) =>
  authController.forgotPassword(req, res)
);

router.post("/auth/reset-password", (req: Request, res: Response) =>
  authController.resetPassword(req, res)
);

// ✅ TOKEN VERIFICATION (SEM next)
router.post("/auth/verify-token", (req: Request, res: Response) =>
  authController.verifyToken(req, res)
);

router.post("/auth/verify-reset-token", (req: Request, res: Response) =>
  authController.verifyResetToken(req, res)
);

// ✅ SESSION MANAGEMENT (SEM next - métodos AuthController)
router.get("/auth/active-sessions", (req: Request, res: Response) =>
  authController.getActiveSessions(req, res)
);

router.delete(
  "/auth/revoke-session/:sessionId",
  (req: Request, res: Response) => authController.revokeSession(req, res)
);

// =============================================
// 📧 EMAIL VERIFICATION ROUTES (PUBLIC)
// =============================================

// ✅ EMAIL VERIFICATION (SEM next - métodos EmailVerificationController)
router.post("/verify/availability", (req: Request, res: Response) =>
  emailController.checkEmailAvailability(req, res)
);

router.post("/verify/availability-cached", (req: Request, res: Response) =>
  emailController.checkEmailAvailabilityCached(req, res)
);

router.post("/verify/availability-advanced", (req: Request, res: Response) =>
  emailController.checkEmailAvailabilityAdvanced(req, res)
);

router.delete("/verify/cache", (req: Request, res: Response) =>
  emailController.clearEmailCache(req, res)
);

router.get("/verify/cache/stats", (req: Request, res: Response) =>
  emailController.getCacheStats(req, res)
);

router.get("/verify/status/:status", (req: Request, res: Response) =>
  emailController.checkStatusInfo(req, res)
);

router.get("/verify/health", (req: Request, res: Response) =>
  emailController.healthCheck(req, res)
);

// =============================================
// 🧹 CLEANUP & ROLLBACK ROUTES
// =============================================

// ✅ CLEANUP (COM next)
router.post(
  "/cleanup/failed-registration",
  (req: Request, res: Response, next: NextFunction) =>
    cleanupController.cleanupFailedRegistration(req, res, next)
);

router.get(
  "/cleanup/status/:email",
  (req: Request, res: Response, next: NextFunction) =>
    cleanupController.getRegistrationStatus(req, res, next)
);

router.get(
  "/cleanup/health",
  (req: Request, res: Response, next: NextFunction) =>
    cleanupController.healthCheck(req, res, next)
);

// ✅ ADMIN CLEANUP (COM next)
router.post(
  "/cleanup/bulk",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    cleanupController.bulkCleanup(req, res, next)
);

// ✅ CLEANUP STATS (SEM next - método sem parâmetros)
router.get(
  "/cleanup/stats",
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => cleanupController.getCleanupStats()
);

// =============================================
// 👤 CLIENT ROUTES
// =============================================

// ✅ CLIENT REGISTRATION (COM next)
router.post(
  "/clients/start-registration",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.startRegistration(req, res, next)
);

router.post(
  "/clients/register",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.register(req, res, next)
);

router.post(
  "/clients/verify-otp",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.verifyOtp(req, res, next)
);

router.get(
  "/clients/verify-email/:token",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.verifyEmail(req, res, next)
);

// ✅ CLIENT PROFILE (COM next)
router.get(
  "/clients/profile",
  authenticate,
  requireClient,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.getProfile(req, res, next)
);

router.patch(
  "/clients/profile",
  authenticate,
  requireClient,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.updateProfile(req, res, next)
);

router.patch(
  "/clients/preferences",
  authenticate,
  requireClient,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.updatePreferences(req, res, next)
);

// ✅ CLIENT PUBLIC PROFILES (COM next)
router.get(
  "/clients/public/:clientId",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.getClientPublicProfile(req, res, next)
);

router.get(
  "/clients/search",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.searchClients(req, res, next)
);

router.get(
  "/clients/featured",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.getFeaturedClients(req, res, next)
);

// ✅ CLIENT STATUS & CLEANUP (COM next)
router.get(
  "/clients/registration-status/:email",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.getRegistrationStatus(req, res, next)
);

router.post(
  "/clients/cleanup",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.cleanupRegistration(req, res, next)
);

// ✅ ADMIN - CLIENT MANAGEMENT (COM next)
router.get(
  "/admin/clients",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.listClients(req, res, next)
);

router.patch(
  "/admin/clients/:clientId/status",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.updateClientStatus(req, res, next)
);

router.patch(
  "/admin/clients/:clientId/loyalty-points",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.updateLoyaltyPoints(req, res, next)
);

router.delete(
  "/admin/clients/:clientId",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.deleteClient(req, res, next)
);

router.patch(
  "/admin/clients/:clientId/restore",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.restoreClient(req, res, next)
);

router.delete(
  "/admin/clients/:clientId/hard",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.hardDeleteClient(req, res, next)
);

// ✅ EMPLOYEE - CLIENT APPOINTMENTS (COM next)
router.post(
  "/employees/clients/:clientId/appointment",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.recordAppointment(req, res, next)
);

// =============================================
// 💼 EMPLOYEE ROUTES
// =============================================

// ✅ EMPLOYEE REGISTRATION (COM next)
router.post(
  "/employees/start-registration",
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.startRegistration(req, res, next)
);

router.post(
  "/employees/register",
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.register(req, res, next)
);

router.post(
  "/employees/verify-otp",
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.verifyOtp(req, res, next)
);

// ✅ EMPLOYEE PROFILE (COM next)
router.get(
  "/employees/profile",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.getProfile(req, res, next)
);

router.patch(
  "/employees/profile",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.updateProfile(req, res, next)
);

router.patch(
  "/employees/:employeeId/availability",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.toggleAvailability(req, res, next)
);

router.patch(
  "/employees/:employeeId/schedule",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.updateWorkSchedule(req, res, next)
);

router.patch(
  "/employees/:employeeId/services",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.updateServices(req, res, next)
);

router.post(
  "/employees/:employeeId/services",
  authenticate,
  requireEmployee,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.addService(req, res, next)
);

// ✅ EMPLOYEE PUBLIC PROFILES (COM next)
router.get(
  "/employees/available",
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.getAvailableEmployees(req, res, next)
);

router.get(
  "/employees/public/:employeeId",
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.getEmployeePublicProfile(req, res, next)
);

// ✅ EMPLOYEE STATUS & CLEANUP (COM next)
router.get(
  "/employees/registration-status/:email",
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.getRegistrationStatus(req, res, next)
);

router.post(
  "/employees/cleanup",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.cleanupRegistration(req, res, next)
);

// ✅ ADMIN - EMPLOYEE MANAGEMENT (COM next)
router.get(
  "/admin/employees",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.listEmployees(req, res, next)
);

router.get(
  "/admin/employees/:employeeId",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.getEmployeeById(req, res, next)
);

router.patch(
  "/admin/employees/:employeeId/status",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.updateEmployeeStatus(req, res, next)
);

router.delete(
  "/admin/employees/:employeeId",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.deleteEmployee(req, res, next)
);

router.patch(
  "/admin/employees/:employeeId/restore",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.restoreEmployee(req, res, next)
);

router.delete(
  "/admin/employees/:employeeId/hard",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.hardDeleteEmployee(req, res, next)
);

// =============================================
// 👨‍💼 ADMIN ROUTES
// =============================================

// ✅ ADMIN REGISTRATION (COM next)
router.post(
  "/admins/start-registration",
  (req: Request, res: Response, next: NextFunction) =>
    adminController.startRegistration(req, res, next)
);

router.post(
  "/admins/register",
  (req: Request, res: Response, next: NextFunction) =>
    adminController.register(req, res, next)
);

router.post(
  "/admins/verify-otp",
  (req: Request, res: Response, next: NextFunction) =>
    adminController.verifyOtp(req, res, next)
);

// ✅ ADMIN PROFILE (COM next)
router.get(
  "/admins/profile",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getProfile(req, res, next)
);

router.patch(
  "/admins/profile",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.updateProfile(req, res, next)
);

router.post(
  "/admins/system-access",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.recordSystemAccess(req, res, next)
);

// ✅ ADMIN STATUS & CLEANUP (COM next)
router.get(
  "/admins/registration-status/:email",
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getRegistrationStatus(req, res, next)
);

router.post(
  "/admins/cleanup",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.cleanupRegistration(req, res, next)
);

// ✅ ADMIN MANAGEMENT (COM next)
router.get(
  "/admins",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.listAdmins(req, res, next)
);

router.patch(
  "/admins/:adminId/permissions",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.updatePermissions(req, res, next)
);

router.patch(
  "/admins/:adminId/access-level",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.updateAccessLevel(req, res, next)
);

router.patch(
  "/admins/:adminId/status",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.updateAdminStatus(req, res, next)
);

// ✅ ADMIN SYSTEM MANAGEMENT (COM next)
router.get(
  "/admin/system-stats",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getSystemStats(req, res, next)
);

router.get(
  "/admin/users",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getAllUsers(req, res, next)
);

router.get(
  "/admin/users/:userId",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getUserById(req, res, next)
);

router.patch(
  "/admin/users/:userId/status",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.updateUserStatus(req, res, next)
);

router.delete(
  "/admin/users/:userId",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.deleteUser(req, res, next)
);

// =============================================
// 🗂️ SESSION ROUTES (COM next)
// =============================================

router.get(
  "/session/active",
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    sessionController.getActiveSessions(req, res, next)
);

router.get(
  "/session/history",
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    sessionController.getSessionHistory(req, res, next)
);

router.get(
  "/session/stats",
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    sessionController.getSessionStats(req, res, next)
);

router.delete(
  "/session/terminate/:sessionId",
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    sessionController.terminateSession(req, res, next)
);

router.delete(
  "/session/terminate-all",
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    sessionController.terminateAllSessions(req, res, next)
);

// =============================================
// 🔄 ACCOUNT MANAGEMENT ROUTES (COM next)
// =============================================

// ✅ ACCOUNT ACTIVATION/DEACTIVATION
router.patch(
  "/users/:userId/activate",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.activateAccount(req, res, next)
);

router.patch(
  "/users/:userId/deactivate",
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) =>
    adminController.deactivateAccount(req, res, next)
);

// ✅ GENERIC PROFILE UPDATE (COM next)
router.patch(
  "/profile",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;

    switch (userRole) {
      case "client":
        return clientController.updateProfile(req, res, next);
      case "employee":
        return employeeController.updateProfile(req, res, next);
      case "admin_system":
        return adminController.updateProfile(req, res, next);
      default:
        return res.status(400).json({
          success: false,
          error: "Tipo de usuário não suportado",
          code: "INVALID_USER_ROLE",
        });
    }
  }
);

// =============================================
// 📊 INTERNAL MONITORING ROUTES
// =============================================

router.get(
  "/internal/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quickDiagnostic = await userDiagnostic.quickDiagnostic();
      res.json({
        service: "User Service Internal Status",
        status: "running",
        timestamp: new Date().toISOString(),
        diagnostic: quickDiagnostic,
        version: "2.3.0",
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/internal/stats",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: {
          user_services: {
            client_count: "N/A",
            employee_count: "N/A",
            admin_count: "N/A",
          },
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            node_version: process.version,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// =============================================
// 🆘 FALLBACK ROUTES
// =============================================

router.all("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

export default router;
