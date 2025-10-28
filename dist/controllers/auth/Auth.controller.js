"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const Auth_service_1 = require("../../services/auth/Auth.service");
const Client_controller_1 = require("../user/client/Client.controller");
const Employee_controller_1 = require("../user/employee/Employee.controller");
const Admin_controller_1 = require("../user/admin/Admin.controller");
const user_roles_1 = require("../../models/interfaces/user.roles");
class AuthController {
    constructor() {
        this.startRegistration = async (req, res, next) => {
            try {
                const { role, email, subRole, ...otherData } = req.body;
                console.log(`🎯 [AuthController] Iniciando registro para: ${email}, role: ${role}, subRole: ${subRole}`);
                switch (role) {
                    case user_roles_1.UserMainRole.CLIENT:
                        return this.clientController.startRegistration(req, res, next);
                    case user_roles_1.UserMainRole.EMPLOYEE:
                        if (!subRole) {
                            return res.status(400).json({
                                success: false,
                                error: "subRole é obrigatório para employees",
                                code: "MISSING_SUBROLE",
                            });
                        }
                        return this.employeeController.startRegistration(req, res, next);
                    case user_roles_1.UserMainRole.ADMINSYSTEM:
                        return this.adminController.startRegistration(req, res, next);
                    default:
                        return res.status(400).json({
                            success: false,
                            error: "Tipo de usuário não suportado",
                            code: "INVALID_ROLE",
                        });
                }
            }
            catch (error) {
                console.error("[AuthController] Erro no start registration:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                const requestInfo = {
                    ip: req.ip || req.socket.remoteAddress || "unknown",
                    userAgent: req.get("User-Agent") || "unknown",
                    isSecure: req.secure || req.get("X-Forwarded-Proto") === "https",
                };
                const result = await this.authService.login(email, password, requestInfo);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro no login:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.refreshToken = async (req, res) => {
            try {
                const { refreshToken } = req.body;
                const requestInfo = {
                    ip: req.ip || req.socket.remoteAddress || "unknown",
                    userAgent: req.get("User-Agent") || "unknown",
                };
                const result = await this.authService.refreshToken(refreshToken, requestInfo);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro no refresh token:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.logout = async (req, res) => {
            try {
                const { sessionId } = req.body;
                const logoutData = {
                    ip: req.ip || req.socket.remoteAddress || "unknown",
                    userAgent: req.get("User-Agent") || "unknown",
                    reason: "user_logout",
                };
                const result = await this.authService.logout(sessionId, logoutData);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro no logout:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.forgotPassword = async (req, res) => {
            try {
                const { email } = req.body;
                const result = await this.authService.forgotPassword(email);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro no forgot password:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.resetPassword = async (req, res) => {
            try {
                const { email, code, newPassword } = req.body;
                const result = await this.authService.resetPassword(email, code, newPassword);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro no reset password:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.verifyToken = async (req, res) => {
            try {
                const { token } = req.body;
                const result = await this.authService.verifyToken(token);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro na verificação de token:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.verifyResetToken = async (req, res) => {
            try {
                const { token } = req.body;
                const result = await this.authService.verifyResetToken(token);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro na verificação de reset token:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.getActiveSessions = async (req, res) => {
            try {
                const { userId } = req.body;
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        error: "ID do usuário é obrigatório",
                        code: "MISSING_USER_ID",
                    });
                }
                const result = await this.authService.getActiveSessions(userId);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro ao buscar sessões ativas:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.revokeSession = async (req, res) => {
            try {
                const { sessionId } = req.params;
                const { userId } = req.body;
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        error: "ID do usuário é obrigatório",
                        code: "MISSING_USER_ID",
                    });
                }
                const revokeData = {
                    ip: req.ip || req.socket.remoteAddress || "unknown",
                    userAgent: req.get("User-Agent") || "unknown",
                };
                const result = await this.authService.revokeSession(sessionId, userId, revokeData);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro ao revogar sessão:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.sendVerification = async (req, res) => {
            try {
                const { email } = req.body;
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        error: "Email é obrigatório",
                        code: "MISSING_EMAIL",
                    });
                }
                const result = await this.authService.sendVerification(email);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro no send verification:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.verifyAccount = async (req, res) => {
            try {
                const { email, code } = req.body;
                if (!email || !code) {
                    return res.status(400).json({
                        success: false,
                        error: "Email e código são obrigatórios",
                        code: "MISSING_CREDENTIALS",
                    });
                }
                const result = await this.authService.verifyAccount(email, code);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                console.error("[AuthController] Erro na verificação de conta:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.validateCredentials = async (req, res) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    return res.status(400).json({
                        success: false,
                        error: "Email e senha são obrigatórios",
                        code: "MISSING_CREDENTIALS",
                    });
                }
                const result = await this.authService.validateCredentials(email, password);
                return res.status(200).json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                console.error("[AuthController] Erro na validação de credenciais:", error);
                return res.status(500).json({
                    success: false,
                    error: "Erro interno no servidor",
                    code: "INTERNAL_ERROR",
                });
            }
        };
        this.authService = new Auth_service_1.AuthService();
        this.clientController = new Client_controller_1.ClientController();
        this.employeeController = new Employee_controller_1.EmployeeController();
        this.adminController = new Admin_controller_1.AdminController();
    }
}
exports.AuthController = AuthController;
exports.default = AuthController;
