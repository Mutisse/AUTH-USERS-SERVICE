"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Auth_controller_1 = require("../controllers/auth/Auth.controller");
const Session_controller_1 = require("../controllers/session/Session.controller");
const Admin_controller_1 = require("../controllers/user/admin/Admin.controller");
const Client_controller_1 = require("../controllers/user/client/Client.controller");
const Employee_controller_1 = require("../controllers/user/employee/Employee.controller");
const EmailVerification_controller_1 = require("../controllers/verificy/email/EmailVerification.controller");
const RegistrationCleanup_controller_1 = require("../controllers/verificy/cleanup/RegistrationCleanup.controller");
const auth_service_diagnostic_1 = require("../services/diagnostics/auth-service.diagnostic");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const authController = new Auth_controller_1.AuthController();
const sessionController = new Session_controller_1.SessionController();
const adminController = new Admin_controller_1.AdminController();
const clientController = new Client_controller_1.ClientController();
const employeeController = new Employee_controller_1.EmployeeController();
const emailController = new EmailVerification_controller_1.EmailVerificationController();
const cleanupController = new RegistrationCleanup_controller_1.RegistrationCleanupController();
router.get("/health", (req, res) => {
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
router.get("/ping", (req, res) => {
    res.json({
        service: "user-service",
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
router.get("/diagnostics/full", async (req, res, next) => {
    try {
        const diagnostic = await auth_service_diagnostic_1.authUserDiagnostic.fullDiagnostic();
        res.json(diagnostic);
    }
    catch (error) {
        next(error);
    }
});
router.get("/diagnostics/quick", async (req, res, next) => {
    try {
        const diagnostic = await auth_service_diagnostic_1.authUserDiagnostic.quickDiagnostic();
        res.json(diagnostic);
    }
    catch (error) {
        next(error);
    }
});
router.post("/auth/start-registration", (req, res, next) => {
    authController.startRegistration(req, res, next);
});
router.post("/auth/login", (req, res) => authController.login(req, res));
router.post("/auth/logout", (req, res) => authController.logout(req, res));
router.post("/auth/refresh-token", (req, res) => authController.refreshToken(req, res));
router.post("/auth/forgot-password", (req, res) => authController.forgotPassword(req, res));
router.post("/auth/reset-password", (req, res) => authController.resetPassword(req, res));
router.post("/auth/verify-token", (req, res) => authController.verifyToken(req, res));
router.post("/auth/verify-reset-token", (req, res) => authController.verifyResetToken(req, res));
router.get("/auth/active-sessions", (req, res) => authController.getActiveSessions(req, res));
router.delete("/auth/revoke-session/:sessionId", (req, res) => authController.revokeSession(req, res));
router.post("/verify/availability", (req, res) => emailController.checkEmailAvailability(req, res));
router.post("/verify/availability-cached", (req, res) => emailController.checkEmailAvailabilityCached(req, res));
router.post("/verify/availability-advanced", (req, res) => emailController.checkEmailAvailabilityAdvanced(req, res));
router.delete("/verify/cache", (req, res) => emailController.clearEmailCache(req, res));
router.get("/verify/cache/stats", (req, res) => emailController.getCacheStats(req, res));
router.get("/verify/status/:status", (req, res) => emailController.checkStatusInfo(req, res));
router.get("/verify/health", (req, res) => emailController.healthCheck(req, res));
router.post("/cleanup/failed-registration", (req, res, next) => cleanupController.cleanupFailedRegistration(req, res, next));
router.get("/cleanup/status/:email", (req, res, next) => cleanupController.getRegistrationStatus(req, res, next));
router.get("/cleanup/health", (req, res, next) => cleanupController.healthCheck(req, res, next));
router.post("/cleanup/bulk", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => cleanupController.bulkCleanup(req, res, next));
router.get("/cleanup/stats", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => {
    try {
        const stats = cleanupController.getCleanupStats();
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
});
router.post("/clients/start-registration", (req, res, next) => clientController.startRegistration(req, res, next));
router.post("/clients/register", (req, res, next) => clientController.register(req, res, next));
router.post("/clients/verify-otp", (req, res, next) => clientController.verifyOtp(req, res, next));
router.get("/clients/verify-email/:token", (req, res, next) => clientController.verifyEmail(req, res, next));
router.get("/clients/profile", auth_middleware_1.authenticate, auth_middleware_1.requireClient, (req, res, next) => clientController.getProfile(req, res, next));
router.patch("/clients/profile", auth_middleware_1.authenticate, auth_middleware_1.requireClient, (req, res, next) => clientController.updateProfile(req, res, next));
router.patch("/clients/preferences", auth_middleware_1.authenticate, auth_middleware_1.requireClient, (req, res, next) => clientController.updatePreferences(req, res, next));
router.get("/clients/public/:clientId", (req, res, next) => clientController.getClientPublicProfile(req, res, next));
router.get("/clients/search", (req, res, next) => clientController.searchClients(req, res, next));
router.get("/clients/featured", (req, res, next) => clientController.getFeaturedClients(req, res, next));
router.get("/clients/registration-status/:email", (req, res, next) => clientController.getRegistrationStatus(req, res, next));
router.post("/clients/cleanup", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.cleanupRegistration(req, res, next));
router.get("/admin/clients", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.listClients(req, res, next));
router.patch("/admin/clients/:clientId/status", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.updateClientStatus(req, res, next));
router.patch("/admin/clients/:clientId/loyalty-points", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.updateLoyaltyPoints(req, res, next));
router.delete("/admin/clients/:clientId", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.deleteClient(req, res, next));
router.patch("/admin/clients/:clientId/restore", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.restoreClient(req, res, next));
router.delete("/admin/clients/:clientId/hard", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => clientController.hardDeleteClient(req, res, next));
router.post("/employees/clients/:clientId/appointment", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => clientController.recordAppointment(req, res, next));
router.post("/employees/start-registration", (req, res, next) => employeeController.startRegistration(req, res, next));
router.post("/employees/register", (req, res, next) => employeeController.register(req, res, next));
router.post("/employees/verify-otp", (req, res, next) => employeeController.verifyOtp(req, res, next));
router.get("/employees/profile", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => employeeController.getProfile(req, res, next));
router.patch("/employees/profile", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => employeeController.updateProfile(req, res, next));
router.patch("/employees/:employeeId/availability", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => employeeController.toggleAvailability(req, res, next));
router.patch("/employees/:employeeId/schedule", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => employeeController.updateWorkSchedule(req, res, next));
router.patch("/employees/:employeeId/services", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => employeeController.updateServices(req, res, next));
router.post("/employees/:employeeId/services", auth_middleware_1.authenticate, auth_middleware_1.requireEmployee, (req, res, next) => employeeController.addService(req, res, next));
router.get("/employees/available", (req, res, next) => employeeController.getAvailableEmployees(req, res, next));
router.get("/employees/public/:employeeId", (req, res, next) => employeeController.getEmployeePublicProfile(req, res, next));
router.get("/employees/registration-status/:email", (req, res, next) => employeeController.getRegistrationStatus(req, res, next));
router.post("/employees/cleanup", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.cleanupRegistration(req, res, next));
router.get("/admin/employees", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.listEmployees(req, res, next));
router.get("/admin/employees/:employeeId", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.getEmployeeById(req, res, next));
router.patch("/admin/employees/:employeeId/status", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.updateEmployeeStatus(req, res, next));
router.delete("/admin/employees/:employeeId", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.deleteEmployee(req, res, next));
router.patch("/admin/employees/:employeeId/restore", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.restoreEmployee(req, res, next));
router.delete("/admin/employees/:employeeId/hard", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => employeeController.hardDeleteEmployee(req, res, next));
router.post("/admins/start-registration", (req, res, next) => adminController.startRegistration(req, res, next));
router.post("/admins/register", (req, res, next) => adminController.register(req, res, next));
router.post("/admins/verify-otp", (req, res, next) => adminController.verifyOtp(req, res, next));
router.get("/admins/profile", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.getProfile(req, res, next));
router.patch("/admins/profile", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.updateProfile(req, res, next));
router.post("/admins/system-access", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.recordSystemAccess(req, res, next));
router.get("/admins/registration-status/:email", (req, res, next) => adminController.getRegistrationStatus(req, res, next));
router.post("/admins/cleanup", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.cleanupRegistration(req, res, next));
router.get("/admins", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.listAdmins(req, res, next));
router.patch("/admins/:adminId/permissions", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.updatePermissions(req, res, next));
router.patch("/admins/:adminId/access-level", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.updateAccessLevel(req, res, next));
router.patch("/admins/:adminId/status", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.updateAdminStatus(req, res, next));
router.get("/admin/system-stats", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.getSystemStats(req, res, next));
router.get("/admin/users", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.getAllUsers(req, res, next));
router.get("/admin/users/:userId", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.getUserById(req, res, next));
router.patch("/admin/users/:userId/status", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.updateUserStatus(req, res, next));
router.delete("/admin/users/:userId", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.deleteUser(req, res, next));
router.get("/session/active", auth_middleware_1.authenticate, (req, res, next) => sessionController.getActiveSessions(req, res, next));
router.get("/session/history", auth_middleware_1.authenticate, (req, res, next) => sessionController.getSessionHistory(req, res, next));
router.get("/session/stats", auth_middleware_1.authenticate, (req, res, next) => sessionController.getSessionStats(req, res, next));
router.delete("/session/terminate/:sessionId", auth_middleware_1.authenticate, (req, res, next) => sessionController.terminateSession(req, res, next));
router.delete("/session/terminate-all", auth_middleware_1.authenticate, (req, res, next) => sessionController.terminateAllSessions(req, res, next));
router.patch("/users/:userId/activate", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.activateAccount(req, res, next));
router.patch("/users/:userId/deactivate", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, (req, res, next) => adminController.deactivateAccount(req, res, next));
router.patch("/profile", auth_middleware_1.authenticate, (req, res, next) => {
    const userRole = req.user?.role;
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
});
router.get("/internal/status", async (req, res, next) => {
    try {
        const quickDiagnostic = await auth_service_diagnostic_1.authUserDiagnostic.quickDiagnostic();
        res.json({
            service: "User Service Internal Status",
            status: "running",
            timestamp: new Date().toISOString(),
            diagnostic: quickDiagnostic,
            version: "2.3.0",
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/internal/stats", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
});
router.all("*", (req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint não encontrado",
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
