"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationController = void 0;
const EmailVerification_service_1 = require("../../../services/verificy/email/EmailVerification.service");
const user_roles_1 = require("../../../models/interfaces/user.roles");
class EmailVerificationController {
    constructor() {
        this.checkEmailAvailability = async (req, res) => {
            await this.handleEmailVerification(req, res, { useCache: false });
        };
        this.checkEmailAvailabilityCached = async (req, res) => {
            await this.handleEmailVerification(req, res, { useCache: true });
        };
        this.checkEmailAvailabilityAdvanced = async (req, res) => {
            try {
                const { email, options } = req.body;
                if (!email) {
                    return this.sendErrorResponse(res, 400, "Email é obrigatório", "MISSING_EMAIL");
                }
                console.log(`🎯 [EMAIL-CONTROLLER] Verificação avançada para: ${email}`, options);
                const result = await this.emailService.checkEmailAvailabilityAdvanced(email, options);
                return res.status(result.statusCode).json(result);
            }
            catch (error) {
                console.error("[EmailController] Erro na verificação avançada:", error);
                return this.sendErrorResponse(res, 500, "Erro interno no servidor", "INTERNAL_ERROR");
            }
        };
        this.checkStatusInfo = async (req, res) => {
            try {
                const { status } = req.params;
                if (!status || !Object.values(user_roles_1.UserStatus).includes(status)) {
                    return res.status(400).json({
                        success: false,
                        error: "Status inválido",
                        validStatuses: Object.values(user_roles_1.UserStatus),
                        timestamp: new Date().toISOString(),
                    });
                }
                const statusInfo = this.emailService.getStatusInfo(status);
                return res.status(200).json({
                    success: true,
                    data: {
                        status,
                        ...statusInfo,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                console.error("[EmailController] Erro ao verificar status:", error);
                return this.sendErrorResponse(res, 500, "Erro interno no servidor", "INTERNAL_ERROR");
            }
        };
        this.clearEmailCache = async (req, res) => {
            try {
                const { email } = req.body;
                this.emailService.clearCache(email);
                console.log(`🗑️ [EMAIL-CONTROLLER] Cache ${email ? `para ${email}` : 'completo'} limpo`);
                return res.status(200).json({
                    success: true,
                    message: email ? `Cache para ${email} limpo` : "Cache de emails limpo com sucesso",
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                console.error("[EmailController] Erro ao limpar cache:", error);
                return this.sendErrorResponse(res, 500, "Erro ao limpar cache", "CACHE_CLEAR_ERROR");
            }
        };
        this.getCacheStats = async (req, res) => {
            try {
                const stats = this.emailService.getCacheStats();
                return res.status(200).json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                console.error("[EmailController] Erro ao obter estatísticas:", error);
                return this.sendErrorResponse(res, 500, "Erro ao obter estatísticas do cache", "STATS_ERROR");
            }
        };
        this.healthCheck = async (req, res) => {
            const cacheStats = this.emailService.getCacheStats();
            res.json({
                service: "Email Verification Controller",
                status: "healthy",
                timestamp: new Date().toISOString(),
                version: "4.0.0",
                features: [
                    "email_availability_check",
                    "advanced_caching_system",
                    "flexible_options",
                    "user_type_detection",
                    "status_management",
                    "performance_monitoring"
                ],
                cache: cacheStats,
                supportedStatuses: Object.values(user_roles_1.UserStatus),
            });
        };
        this.emailService = new EmailVerification_service_1.EmailVerificationService();
    }
    async handleEmailVerification(req, res, defaultOptions = {}) {
        const startTime = Date.now();
        try {
            const { email, options } = req.body;
            if (!email) {
                return this.sendErrorResponse(res, 400, "Email é obrigatório", "MISSING_EMAIL", startTime);
            }
            const processingOptions = { ...defaultOptions, ...options };
            const result = await this.emailService.checkEmailAvailabilityAdvanced(email, processingOptions);
            return res.status(result.statusCode).json(result);
        }
        catch (error) {
            console.error("[EmailController] Erro ao verificar email:", error);
            return this.sendErrorResponse(res, 500, "Erro interno no servidor", "INTERNAL_ERROR", startTime);
        }
    }
    sendErrorResponse(res, statusCode, error, code, startTime) {
        const responseTime = startTime ? Date.now() - startTime : 0;
        return res.status(statusCode).json({
            success: false,
            error,
            code,
            timestamp: new Date().toISOString(),
            ...(responseTime > 0 && { responseTime: `${responseTime}ms` })
        });
    }
}
exports.EmailVerificationController = EmailVerificationController;
