"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const Client_model_1 = require("../../models/user/client/Client.model");
const Employee_model_1 = require("../../models/user/employee/Employee.model");
const Admin_model_1 = require("../../models/user/admin/Admin.model");
const Session_service_1 = require("../session/Session.service");
const RegistrationCleanupUtil_1 = require("../../utils/RegistrationCleanupUtil");
const OtpClient_service_1 = require("../otp/OtpClient.service");
const jwt_utils_1 = require("../../utils/jwt.utils");
class AuthService {
    constructor() {
        this.sessionService = new Session_service_1.SessionService();
        this.cleanupUtil = new RegistrationCleanupUtil_1.RegistrationCleanupUtil(Client_model_1.ClientModel);
        this.cleanupUtil.startScheduledCleanup();
        this.otpClient = new OtpClient_service_1.OtpClientService();
    }
    async sendVerification(email) {
        try {
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: email.toLowerCase().trim() }),
                Employee_model_1.EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
                Admin_model_1.AdminModel.findOne({ email: email.toLowerCase().trim() }),
            ]);
            const exists = !!(client || employee || admin);
            if (exists) {
                return {
                    success: false,
                    error: "Email já cadastrado",
                    code: "EMAIL_ALREADY_EXISTS",
                    statusCode: 409,
                };
            }
            console.log(`📧 [AuthService] Email disponível: ${email} - OTP será enviado pelo Gateway`);
            return {
                success: true,
                message: "Email disponível para cadastro",
                data: {
                    email,
                    available: true,
                    requiresOtp: true,
                    timestamp: new Date().toISOString(),
                },
                statusCode: 200,
            };
        }
        catch (error) {
            console.error("[AuthService] Erro no sendVerification:", error);
            return {
                success: false,
                error: "Erro ao verificar email",
                code: "VERIFICATION_ERROR",
                statusCode: 500,
            };
        }
    }
    async login(email, password, requestInfo) {
        try {
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: email.toLowerCase().trim() }).select("+password"),
                Employee_model_1.EmployeeModel.findOne({ email: email.toLowerCase().trim() }).select("+password"),
                Admin_model_1.AdminModel.findOne({ email: email.toLowerCase().trim() }).select("+password"),
            ]);
            const user = client || employee || admin;
            if (!user) {
                return {
                    success: false,
                    error: "Credenciais inválidas",
                    code: "INVALID_CREDENTIALS",
                    statusCode: 401,
                };
            }
            const userRole = user.role;
            const userId = user._id.toString();
            const userEmail = user.email;
            const userIsVerified = user.isVerified;
            const userIsActive = user.isActive;
            const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    error: "Credenciais inválidas",
                    code: "INVALID_CREDENTIALS",
                    statusCode: 401,
                };
            }
            if (!userIsActive) {
                return {
                    success: false,
                    error: "Conta desativada",
                    code: "ACCOUNT_DISABLED",
                    statusCode: 423,
                };
            }
            if (userRole === "client" && !userIsVerified) {
                return {
                    success: false,
                    error: "Email não verificado",
                    code: "EMAIL_NOT_VERIFIED",
                    statusCode: 403,
                };
            }
            await this.updateLastLogin(userId, userRole);
            let subRole;
            if (userRole === "employee") {
                subRole = user.employeeData?.subRole;
            }
            else if (userRole === "admin_system") {
                subRole = user.adminData?.accessLevel;
            }
            const tokenPair = (0, jwt_utils_1.generateTokenPair)({
                id: userId,
                email: userEmail,
                role: userRole,
                subRole: subRole,
                isVerified: userIsVerified,
            });
            const session = await this.sessionService.createSession({
                userId: userId,
                userRole: userRole,
                userEmail: userEmail,
                userName: user.fullName?.displayName || userEmail,
            }, {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: tokenPair.expiresIn,
            }, {
                ip: requestInfo.ip,
                userAgent: requestInfo.userAgent,
                isSecure: requestInfo.isSecure,
            });
            const userWithoutPassword = { ...user.toObject() };
            delete userWithoutPassword.password;
            return {
                success: true,
                data: {
                    user: userWithoutPassword,
                    accessToken: tokenPair.accessToken,
                    refreshToken: tokenPair.refreshToken,
                    expiresIn: tokenPair.expiresIn,
                    sessionId: session._id,
                },
                statusCode: 200,
                message: "Login realizado com sucesso",
            };
        }
        catch (error) {
            console.error("[AuthService] Erro no login:", error);
            return {
                success: false,
                error: "Erro interno no servidor",
                code: "INTERNAL_ERROR",
                statusCode: 500,
            };
        }
    }
    async refreshToken(refreshToken, requestInfo) {
        try {
            const result = (0, jwt_utils_1.refreshAccessToken)(refreshToken);
            try {
                const payload = (0, jwt_utils_1.decodeToken)(refreshToken);
                const sessionId = payload.sessionId;
                if (sessionId && requestInfo) {
                    await this.sessionService.updateSessionActivity(sessionId, {
                        ip: requestInfo.ip || "unknown",
                        userAgent: requestInfo.userAgent || "unknown",
                        route: "refresh-token",
                    });
                }
            }
            catch (sessionError) {
                console.error("[AuthService] Erro ao atualizar sessão no refresh:", sessionError);
            }
            return {
                success: true,
                data: result,
                statusCode: 200,
                message: "Token atualizado com sucesso",
            };
        }
        catch (error) {
            return {
                success: false,
                error: "Refresh token inválido ou expirado",
                code: "INVALID_REFRESH_TOKEN",
                statusCode: 401,
            };
        }
    }
    async verifyToken(token) {
        try {
            const payload = (0, jwt_utils_1.verifyToken)(token);
            const payloadAny = payload;
            return {
                success: true,
                data: {
                    valid: true,
                    user: {
                        id: payloadAny.id,
                        email: payloadAny.email,
                        role: payloadAny.role,
                        subRole: payloadAny.subRole,
                        isVerified: payloadAny.isVerified,
                    },
                    expiresIn: payloadAny.exp ? new Date(payloadAny.exp * 1000) : null,
                },
                statusCode: 200,
                message: "Token válido",
            };
        }
        catch (error) {
            return {
                success: false,
                error: "Token inválido ou expirado",
                code: "INVALID_TOKEN",
                statusCode: 401,
            };
        }
    }
    async resetPassword(email, code, newPassword) {
        try {
            if (newPassword.length < 6) {
                return {
                    success: false,
                    error: "A senha deve ter pelo menos 6 caracteres",
                    code: "WEAK_PASSWORD",
                    statusCode: 400,
                };
            }
            console.log(`[AuthService] Verificando OTP para: ${email}, código: ${code}`);
            const otpResult = await this.otpClient.verifyPasswordRecoveryOTP(email, code);
            if (!otpResult.success) {
                return {
                    success: false,
                    error: otpResult.message || "Código de verificação inválido ou expirado",
                    code: "INVALID_OTP",
                    statusCode: 400,
                };
            }
            console.log(`✅ [AuthService] OTP verificado - Redefinindo senha para: ${email}`);
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: email.toLowerCase().trim() }),
                Employee_model_1.EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
                Admin_model_1.AdminModel.findOne({ email: email.toLowerCase().trim() }),
            ]);
            const user = client || employee || admin;
            if (!user) {
                return {
                    success: false,
                    error: "Usuário não encontrado",
                    code: "USER_NOT_FOUND",
                    statusCode: 404,
                };
            }
            const userId = user._id;
            const hashedPassword = await bcrypt_1.default.hash(newPassword, 12);
            if (client) {
                await Client_model_1.ClientModel.findByIdAndUpdate(userId, {
                    password: hashedPassword,
                });
            }
            else if (employee) {
                await Employee_model_1.EmployeeModel.findByIdAndUpdate(userId, {
                    password: hashedPassword,
                });
            }
            else if (admin) {
                await Admin_model_1.AdminModel.findByIdAndUpdate(userId, {
                    password: hashedPassword,
                });
            }
            await this.sessionService.terminateAllUserSessions(userId.toString(), "password_reset");
            return {
                success: true,
                message: "Senha redefinida com sucesso",
                data: {
                    email,
                    passwordUpdated: true,
                    timestamp: new Date().toISOString(),
                },
                statusCode: 200,
            };
        }
        catch (error) {
            console.error("[AuthService] Erro no reset password:", error);
            return {
                success: false,
                error: "Erro ao redefinir senha",
                code: "RESET_PASSWORD_ERROR",
                statusCode: 500,
            };
        }
    }
    async verifyAccount(email, code) {
        try {
            console.log(`[AuthService] Verificando conta: ${email}, código: ${code}`);
            const client = await Client_model_1.ClientModel.findOne({
                email: email.toLowerCase().trim(),
            });
            if (!client) {
                return {
                    success: false,
                    error: "Usuário não encontrado",
                    code: "USER_NOT_FOUND",
                    statusCode: 404,
                };
            }
            await Client_model_1.ClientModel.findByIdAndUpdate(client._id, {
                isVerified: true,
                verifiedAt: new Date(),
            });
            return {
                success: true,
                message: "Conta verificada com sucesso",
                data: {
                    email,
                    verified: true,
                    timestamp: new Date().toISOString(),
                },
                statusCode: 200,
            };
        }
        catch (error) {
            console.error("[AuthService] Erro ao verificar conta:", error);
            return {
                success: false,
                error: "Erro ao verificar conta",
                code: "VERIFICATION_ERROR",
                statusCode: 500,
            };
        }
    }
    async forgotPassword(email) {
        try {
            if (!email) {
                return {
                    success: false,
                    error: "Email é obrigatório",
                    code: "MISSING_EMAIL",
                    statusCode: 400,
                };
            }
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: email.toLowerCase().trim() }),
                Employee_model_1.EmployeeModel.findOne({ email: email.toLowerCase().trim() }),
                Admin_model_1.AdminModel.findOne({ email: email.toLowerCase().trim() }),
            ]);
            const user = client || employee || admin;
            if (!user) {
                console.log(`📧 [AuthService] Email não encontrado: ${email} - Retornando resposta segura`);
                return {
                    success: true,
                    message: "Se o email existir em nosso sistema, você receberá um código de recuperação",
                    data: {
                        emailExists: false,
                        requiresOtp: true,
                    },
                    statusCode: 200,
                };
            }
            const userId = user._id.toString();
            const userName = user.fullName?.displayName || user.name || email;
            console.log(`📧 [AuthService] Usuário encontrado: ${email} - Enviando OTP de recuperação...`);
            const otpResult = await this.otpClient.sendPasswordRecoveryOTP(email, userName);
            if (!otpResult.success) {
                console.warn(`⚠️ [AuthService] OTP não enviado para ${email}: ${otpResult.message}`);
                return {
                    success: true,
                    message: "Solicitação processada. Verifique seu email para o código de recuperação",
                    data: {
                        email,
                        emailExists: true,
                        requiresOtp: true,
                        purpose: "reset-password",
                        otpSent: false,
                        fallback: true,
                    },
                    statusCode: 200,
                };
            }
            console.log(`✅ [AuthService] OTP enviado com sucesso para: ${email}`);
            return {
                success: true,
                message: "Código de recuperação enviado para seu email",
                data: {
                    email,
                    emailExists: true,
                    requiresOtp: true,
                    purpose: "reset-password",
                    otpSent: true,
                },
                statusCode: 200,
            };
        }
        catch (error) {
            console.error("[AuthService] Erro no forgot password:", error);
            return {
                success: true,
                message: "Solicitação processada. Verifique seu email para o código de recuperação",
                data: {
                    email,
                    emailExists: true,
                    requiresOtp: true,
                    purpose: "reset-password",
                    otpSent: false,
                    fallback: true,
                },
                statusCode: 200,
            };
        }
    }
    async updateLastLogin(userId, role) {
        try {
            const updateData = {
                lastLogin: new Date(),
                lastActivity: new Date(),
                $inc: { loginCount: 1 },
                $set: { failedLoginAttempts: 0 },
            };
            switch (role) {
                case "client":
                    await Client_model_1.ClientModel.findByIdAndUpdate(userId, updateData);
                    break;
                case "employee":
                    await Employee_model_1.EmployeeModel.findByIdAndUpdate(userId, updateData);
                    break;
                case "admin_system":
                    await Admin_model_1.AdminModel.findByIdAndUpdate(userId, updateData);
                    break;
            }
        }
        catch (error) {
            console.error("[AuthService] Erro ao atualizar último login:", error);
        }
    }
    async validateCredentials(email, password) {
        try {
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: email.toLowerCase().trim() }).select("+password"),
                Employee_model_1.EmployeeModel.findOne({ email: email.toLowerCase().trim() }).select("+password"),
                Admin_model_1.AdminModel.findOne({ email: email.toLowerCase().trim() }).select("+password"),
            ]);
            const user = client || employee || admin;
            if (!user) {
                return { isValid: false, user: null };
            }
            const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
            return { isValid: isPasswordValid, user };
        }
        catch (error) {
            console.error("[AuthService] Erro ao validar credenciais:", error);
            return { isValid: false, user: null };
        }
    }
    async verifyResetToken(token) {
        try {
            const payload = (0, jwt_utils_1.verifyToken)(token);
            return {
                success: true,
                data: {
                    valid: true,
                    email: payload.email,
                    canReset: true,
                },
                statusCode: 200,
                message: "Token de redefinição válido",
            };
        }
        catch (error) {
            return {
                success: false,
                error: "Token de redefinição inválido ou expirado",
                code: "INVALID_RESET_TOKEN",
                statusCode: 401,
            };
        }
    }
    async getActiveSessions(userId) {
        try {
            const sessions = await this.sessionService.getUserActiveSessions(userId);
            return {
                success: true,
                data: {
                    sessions,
                    total: sessions.length,
                },
                statusCode: 200,
            };
        }
        catch (error) {
            console.error("[AuthService] Erro ao buscar sessões ativas:", error);
            return {
                success: false,
                error: "Erro ao buscar sessões ativas",
                code: "GET_SESSIONS_ERROR",
                statusCode: 500,
            };
        }
    }
    async revokeSession(sessionId, userId, revokeData) {
        try {
            const session = await this.sessionService.logoutSession(sessionId, {
                ...revokeData,
                reason: "revoked_by_user",
            });
            if (!session) {
                return {
                    success: false,
                    error: "Sessão não encontrada",
                    code: "SESSION_NOT_FOUND",
                    statusCode: 404,
                };
            }
            if (session.userId !== userId) {
                return {
                    success: false,
                    error: "Não autorizado",
                    code: "UNAUTHORIZED",
                    statusCode: 403,
                };
            }
            return {
                success: true,
                data: {
                    sessionId,
                    revoked: true,
                    timestamp: new Date().toISOString(),
                },
                statusCode: 200,
                message: "Sessão revogada com sucesso",
            };
        }
        catch (error) {
            console.error("[AuthService] Erro ao revogar sessão:", error);
            return {
                success: false,
                error: "Erro ao revogar sessão",
                code: "REVOKE_SESSION_ERROR",
                statusCode: 500,
            };
        }
    }
    async logout(sessionId, logoutData) {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: "ID da sessão é obrigatório",
                    code: "MISSING_SESSION_ID",
                    statusCode: 400,
                };
            }
            const session = await this.sessionService.logoutSession(sessionId, logoutData);
            if (!session) {
                return {
                    success: true,
                    data: {
                        sessionId,
                        loggedOut: true,
                        timestamp: new Date().toISOString(),
                    },
                    statusCode: 200,
                    message: "Sessão já finalizada",
                };
            }
            return {
                success: true,
                data: {
                    sessionId: session._id,
                    loggedOut: true,
                    timestamp: new Date().toISOString(),
                },
                statusCode: 200,
                message: "Logout realizado com sucesso",
            };
        }
        catch (error) {
            console.error("[AuthService] Erro no logout:", error);
            if (error.message?.includes("não encontrada")) {
                return {
                    success: true,
                    data: {
                        sessionId,
                        loggedOut: true,
                        timestamp: new Date().toISOString(),
                    },
                    statusCode: 200,
                    message: "Sessão já finalizada",
                };
            }
            return {
                success: false,
                error: "Erro ao realizar logout",
                code: "LOGOUT_ERROR",
                statusCode: 500,
            };
        }
    }
    async triggerCleanup() {
        try {
            const result = await this.cleanupUtil.manualCleanup();
            if (result.success) {
                return {
                    success: true,
                    deletedCount: result.deletedCount,
                    message: `Limpeza manual concluída: ${result.deletedCount} registros removidos`,
                };
            }
            else {
                return {
                    success: false,
                    message: "Erro na limpeza manual",
                };
            }
        }
        catch (error) {
            console.error("[AuthService] Erro na limpeza manual:", error);
            return {
                success: false,
                message: "Erro ao executar limpeza manual",
            };
        }
    }
}
exports.AuthService = AuthService;
