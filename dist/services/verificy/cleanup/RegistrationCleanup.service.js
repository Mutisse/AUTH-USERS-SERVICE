"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationCleanupService = void 0;
const Client_model_1 = require("../../../models/user/client/Client.model");
const Employee_model_1 = require("../../../models/user/employee/Employee.model");
const Admin_model_1 = require("../../../models/user/admin/Admin.model");
const EmailVerification_service_1 = require("../email/EmailVerification.service");
const AppError_1 = require("../../../utils/AppError");
class RegistrationCleanupService {
    constructor() {
        this.emailService = new EmailVerification_service_1.EmailVerificationService();
    }
    async cleanupFailedRegistration(email, role, reason, step, data) {
        try {
            console.log(`🧹 [CLEANUP] Iniciando limpeza para: ${email}, role: ${role}, motivo: ${reason}`);
            const normalizedEmail = email.toLowerCase().trim();
            const userExists = await this.checkUserExists(normalizedEmail, role);
            if (!userExists.exists) {
                return {
                    success: true,
                    cleaned: false,
                    message: "Usuário não encontrado - nada para limpar",
                };
            }
            let cleaned = false;
            let message = "";
            switch (role.toLowerCase()) {
                case "client":
                    cleaned = await this.cleanupClient(normalizedEmail, reason);
                    message = cleaned
                        ? "Cliente removido com sucesso"
                        : "Cliente não necessitava de limpeza";
                    break;
                case "employee":
                    cleaned = await this.cleanupEmployee(normalizedEmail, reason);
                    message = cleaned
                        ? "Employee removido com sucesso"
                        : "Employee não necessitava de limpeza";
                    break;
                case "admin":
                    cleaned = await this.cleanupAdmin(normalizedEmail, reason);
                    message = cleaned
                        ? "Admin removido com sucesso"
                        : "Admin não necessitava de limpeza";
                    break;
                default:
                    throw new AppError_1.AppError(`Role inválido para limpeza: ${role}`, 400, "INVALID_ROLE");
            }
            this.emailService.clearCache(normalizedEmail);
            await this.recordFailedRegistration({
                email: normalizedEmail,
                role,
                reason,
                step,
                data,
                timestamp: new Date(),
            });
            console.log(`✅ [CLEANUP] Limpeza concluída para: ${email} - ${message}`);
            return {
                success: true,
                cleaned,
                message,
            };
        }
        catch (error) {
            console.error(`❌ [CLEANUP] Erro na limpeza para ${email}:`, error);
            return {
                success: false,
                cleaned: false,
                message: `Erro na limpeza: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            };
        }
    }
    async checkUserExists(email, role) {
        try {
            let user;
            switch (role.toLowerCase()) {
                case "client":
                    user = await Client_model_1.ClientModel.findOne({ email }).select("status").lean();
                    break;
                case "employee":
                    user = await Employee_model_1.EmployeeModel.findOne({ email }).select("status").lean();
                    break;
                case "admin":
                    user = await Admin_model_1.AdminModel.findOne({ email }).select("status").lean();
                    break;
                default:
                    return { exists: false };
            }
            return {
                exists: !!user,
                status: user?.status,
            };
        }
        catch (error) {
            console.error(`[CLEANUP] Erro ao verificar usuário ${email}:`, error);
            return { exists: false };
        }
    }
    async cleanupClient(email, reason) {
        try {
            const result = await Client_model_1.ClientModel.deleteOne({
                email,
                status: {
                    $in: [
                        "pending",
                        "pending_verification",
                        "onboarding",
                        "profile_setup",
                    ],
                },
            });
            const deleted = result.deletedCount > 0;
            if (deleted) {
                console.log(`🗑️ [CLEANUP] Cliente removido: ${email} - Motivo: ${reason}`);
            }
            else {
                console.log(`ℹ️ [CLEANUP] Cliente ${email} não necessitava de remoção (status ativo ou já removido)`);
            }
            return deleted;
        }
        catch (error) {
            console.error(`[CLEANUP] Erro ao limpar cliente ${email}:`, error);
            return false;
        }
    }
    async cleanupEmployee(email, reason) {
        try {
            const result = await Employee_model_1.EmployeeModel.deleteOne({
                email,
                status: {
                    $in: [
                        "pending",
                        "pending_verification",
                        "onboarding",
                        "profile_setup",
                    ],
                },
            });
            const deleted = result.deletedCount > 0;
            if (deleted) {
                console.log(`🗑️ [CLEANUP] Employee removido: ${email} - Motivo: ${reason}`);
            }
            else {
                console.log(`ℹ️ [CLEANUP] Employee ${email} não necessitava de remoção (status ativo ou já removido)`);
            }
            return deleted;
        }
        catch (error) {
            console.error(`[CLEANUP] Erro ao limpar employee ${email}:`, error);
            return false;
        }
    }
    async cleanupAdmin(email, reason) {
        try {
            const result = await Admin_model_1.AdminModel.deleteOne({
                email,
                status: {
                    $in: [
                        "pending",
                        "pending_verification",
                        "onboarding",
                        "profile_setup",
                    ],
                },
            });
            const deleted = result.deletedCount > 0;
            if (deleted) {
                console.log(`🗑️ [CLEANUP] Admin removido: ${email} - Motivo: ${reason}`);
            }
            else {
                console.log(`ℹ️ [CLEANUP] Admin ${email} não necessitava de remoção (status ativo ou já removido)`);
            }
            return deleted;
        }
        catch (error) {
            console.error(`[CLEANUP] Erro ao limpar admin ${email}:`, error);
            return false;
        }
    }
    async recordFailedRegistration(data) {
        try {
            console.log(`📝 [REGISTRATION_FAILURE]`, {
                email: data.email,
                role: data.role,
                reason: data.reason,
                step: data.step,
                timestamp: data.timestamp,
            });
        }
        catch (error) {
            console.error("[CLEANUP] Erro ao registrar falha:", error);
        }
    }
    async bulkCleanupStaleRegistrations(hoursOld = 24) {
        try {
            const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
            console.log(`🧹 [BULK_CLEANUP] Iniciando limpeza de registros com mais de ${hoursOld} horas`);
            const [clients, employees, admins] = await Promise.all([
                Client_model_1.ClientModel.deleteMany({
                    status: { $in: ["pending", "pending_verification"] },
                    createdAt: { $lt: cutoffDate },
                }),
                Employee_model_1.EmployeeModel.deleteMany({
                    status: { $in: ["pending", "pending_verification"] },
                    createdAt: { $lt: cutoffDate },
                }),
                Admin_model_1.AdminModel.deleteMany({
                    status: { $in: ["pending", "pending_verification"] },
                    createdAt: { $lt: cutoffDate },
                }),
            ]);
            const totalCleaned = clients.deletedCount + employees.deletedCount + admins.deletedCount;
            console.log(`✅ [BULK_CLEANUP] Concluído: ${totalCleaned} registros removidos`, {
                clients: clients.deletedCount,
                employees: employees.deletedCount,
                admins: admins.deletedCount,
            });
            return {
                success: true,
                cleaned: {
                    clients: clients.deletedCount,
                    employees: employees.deletedCount,
                    admins: admins.deletedCount,
                },
                message: `Limpeza concluída: ${totalCleaned} registros antigos removidos`,
            };
        }
        catch (error) {
            console.error("[BULK_CLEANUP] Erro na limpeza em massa:", error);
            return {
                success: false,
                cleaned: { clients: 0, employees: 0, admins: 0 },
                message: `Erro na limpeza em massa: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            };
        }
    }
    async getRegistrationStatus(email) {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: normalizedEmail })
                    .select("status createdAt")
                    .lean(),
                Employee_model_1.EmployeeModel.findOne({ email: normalizedEmail })
                    .select("status createdAt")
                    .lean(),
                Admin_model_1.AdminModel.findOne({ email: normalizedEmail })
                    .select("status createdAt")
                    .lean(),
            ]);
            const user = client || employee || admin;
            if (!user) {
                return { exists: false, needsCleanup: false };
            }
            const role = client ? "client" : employee ? "employee" : "admin";
            const status = user.status;
            const pendingStatuses = [
                "pending",
                "pending_verification",
                "onboarding",
                "profile_setup",
            ];
            const needsCleanup = pendingStatuses.includes(status);
            return {
                exists: true,
                role,
                status,
                createdAt: user.createdAt,
                needsCleanup,
            };
        }
        catch (error) {
            console.error(`[CLEANUP] Erro ao verificar status de ${email}:`, error);
            return { exists: false, needsCleanup: false };
        }
    }
}
exports.RegistrationCleanupService = RegistrationCleanupService;
