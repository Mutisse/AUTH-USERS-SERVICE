"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationCleanupController = void 0;
const RegistrationCleanup_service_1 = require("../../../services/verificy/cleanup/RegistrationCleanup.service");
const AppError_1 = require("../../../utils/AppError");
class RegistrationCleanupController {
    constructor() {
        this.cleanupFailedRegistration = async (req, res, next) => {
            try {
                const { email, role, reason, step, data } = req.body;
                if (!email || !role || !reason || !step) {
                    throw new AppError_1.AppError("Email, role, reason e step são obrigatórios", 400, "MISSING_REQUIRED_FIELDS");
                }
                const validSteps = [
                    "start_registration",
                    "otp_verification",
                    "final_registration",
                ];
                if (!validSteps.includes(step)) {
                    throw new AppError_1.AppError(`Step inválido. Deve ser um dos: ${validSteps.join(", ")}`, 400, "INVALID_STEP");
                }
                const result = await this.cleanupService.cleanupFailedRegistration(email, role, reason, step, data);
                return res.status(200).json({
                    success: result.success,
                    data: {
                        email,
                        role,
                        cleaned: result.cleaned,
                        message: result.message,
                        timestamp: new Date().toISOString(),
                    },
                    metadata: {
                        processedAt: new Date().toISOString(),
                        step,
                    },
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.bulkCleanup = async (req, res, next) => {
            try {
                const { hours = 24 } = req.body;
                const hoursNumber = parseInt(hours);
                if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 720) {
                    throw new AppError_1.AppError("Hours deve ser um número entre 1 e 720 (1 hora a 30 dias)", 400, "INVALID_HOURS");
                }
                const result = await this.cleanupService.bulkCleanupStaleRegistrations(hoursNumber);
                return res.status(200).json({
                    success: result.success,
                    data: {
                        hours: hoursNumber,
                        cleaned: result.cleaned,
                        message: result.message,
                        timestamp: new Date().toISOString(),
                    },
                    metadata: {
                        processedAt: new Date().toISOString(),
                        totalCleaned: result.cleaned.clients +
                            result.cleaned.employees +
                            result.cleaned.admins,
                    },
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.getRegistrationStatus = async (req, res, next) => {
            try {
                const { email } = req.params;
                if (!email) {
                    throw new AppError_1.AppError("Email é obrigatório", 400, "MISSING_EMAIL");
                }
                const status = await this.cleanupService.getRegistrationStatus(email);
                return res.status(200).json({
                    success: true,
                    data: {
                        email,
                        ...status,
                        timestamp: new Date().toISOString(),
                    },
                    metadata: {
                        processedAt: new Date().toISOString(),
                    },
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.healthCheck = async (req, res, next) => {
            try {
                const testEmail = "test@cleanup.com";
                const status = await this.cleanupService.getRegistrationStatus(testEmail);
                return res.status(200).json({
                    success: true,
                    data: {
                        service: "registration-cleanup",
                        status: "healthy",
                        timestamp: new Date().toISOString(),
                        database: "connected",
                        features: [
                            "failed_registration_cleanup",
                            "bulk_cleanup",
                            "registration_status_check",
                        ],
                    },
                });
            }
            catch (error) {
                console.error("[CLEANUP_HEALTH] Erro no health check:", error);
                return res.status(503).json({
                    success: false,
                    error: "Cleanup service unhealthy",
                    timestamp: new Date().toISOString(),
                });
            }
        };
        this.cleanupService = new RegistrationCleanup_service_1.RegistrationCleanupService();
    }
    async getCleanupStats() {
        try {
            return {
                totalCleanups: 0,
                failedRegistrations: 0,
                successfulCleanups: 0,
                pendingCleanups: 0,
                byUserType: {
                    client: 0,
                    employee: 0,
                    admin: 0,
                },
                lastCleanup: null,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error("[CleanupService] Erro ao obter estatísticas:", error);
            throw error;
        }
    }
}
exports.RegistrationCleanupController = RegistrationCleanupController;
