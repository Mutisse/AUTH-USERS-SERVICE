"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationService = void 0;
const Client_model_1 = require("../../../models/user/client/Client.model");
const Employee_model_1 = require("../../../models/user/employee/Employee.model");
const Admin_model_1 = require("../../../models/user/admin/Admin.model");
const user_roles_1 = require("../../../models/interfaces/user.roles");
class EmailVerificationService {
    constructor() {
        this.cache = new Map();
        this.DEFAULT_CACHE_TTL = 5 * 60 * 1000;
        this.CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000;
        this.DEFAULT_OPTIONS = {
            useCache: true,
            cacheTtl: this.DEFAULT_CACHE_TTL,
            fallbackOnError: true,
            includeUserDetails: false,
            timeout: 5000,
            validateEmail: true,
        };
        this.startCacheCleanup();
    }
    async checkEmailAvailability(email) {
        return this.checkEmailAvailabilityAdvanced(email, { useCache: false });
    }
    async checkEmailAvailabilityCached(email) {
        return this.checkEmailAvailabilityAdvanced(email, { useCache: true });
    }
    async checkEmailAvailabilityAdvanced(email, options = {}) {
        const config = { ...this.DEFAULT_OPTIONS, ...options };
        const startTime = Date.now();
        try {
            if (config.validateEmail && !this.isValidEmail(email)) {
                return this.buildErrorResponse(email, "Formato de email inválido", "INVALID_EMAIL_FORMAT", 400, startTime);
            }
            if (config.useCache) {
                const cached = this.getFromCache(email);
                if (cached) {
                    return this.buildSuccessResponse(email, cached, startTime, true);
                }
            }
            const dbResult = await this.withTimeout(this.checkEmailInDatabase(email, config.includeUserDetails), config.timeout);
            if (config.useCache) {
                this.setToCache(email, dbResult, config.cacheTtl);
            }
            return this.buildSuccessResponse(email, dbResult, startTime, false);
        }
        catch (error) {
            console.error("[EmailService] Erro ao verificar email:", error);
            if (config.fallbackOnError) {
                const fallbackResult = await this.getFallbackResult(email, error);
                return this.buildSuccessResponse(email, fallbackResult, startTime, false, true);
            }
            return this.buildErrorResponse(email, "Erro ao verificar disponibilidade do email", "EMAIL_CHECK_ERROR", 500, startTime);
        }
    }
    async checkEmailInDatabase(email, includeDetails = false) {
        const normalizedEmail = email.toLowerCase().trim();
        try {
            const [client, employee, admin] = await Promise.all([
                Client_model_1.ClientModel.findOne({ email: normalizedEmail })
                    .select(includeDetails
                    ? "email status isActive lastLogin createdAt"
                    : "email status isActive")
                    .lean(),
                Employee_model_1.EmployeeModel.findOne({ email: normalizedEmail })
                    .select(includeDetails
                    ? "email status isActive lastLogin createdAt"
                    : "email status isActive")
                    .lean(),
                Admin_model_1.AdminModel.findOne({ email: normalizedEmail })
                    .select(includeDetails
                    ? "email status isActive lastLogin createdAt"
                    : "email status isActive")
                    .lean(),
            ]);
            const user = client || employee || admin;
            if (!user) {
                return {
                    exists: false,
                    isActive: false,
                    userType: undefined,
                    status: undefined,
                };
            }
            let userType;
            let isActive = false;
            let status;
            if (client) {
                userType = user_roles_1.UserMainRole.CLIENT;
                status = client.status;
                isActive = this.determineAccountStatus(client.status, client.isActive);
            }
            else if (employee) {
                userType = user_roles_1.UserMainRole.EMPLOYEE;
                status = employee.status;
                isActive = this.determineAccountStatus(employee.status, employee.isActive);
            }
            else if (admin) {
                userType = user_roles_1.UserMainRole.ADMINSYSTEM;
                status = admin.status;
                isActive = this.determineAccountStatus(admin.status, admin.isActive);
            }
            const result = {
                exists: true,
                isActive,
                userType,
                status,
            };
            if (includeDetails) {
                result.lastLogin = user.lastLogin;
                result.createdAt = user.createdAt;
            }
            return result;
        }
        catch (error) {
            console.error("[EmailService] Erro ao consultar banco:", error);
            throw error;
        }
    }
    buildSuccessResponse(email, result, startTime, fromCache, fromFallback = false) {
        const responseTime = Date.now() - startTime;
        const available = !result.exists || !result.isActive;
        const response = {
            success: true,
            data: {
                email,
                available,
                exists: result.exists,
                isActive: result.isActive,
                userType: result.userType,
                status: result.status,
                canRegister: available,
                fromCache,
                fromFallback,
                reason: this.getReasonMessage(result.exists, result.isActive, result.userType, result.status),
                timestamp: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                ...(result.lastLogin && { lastLogin: result.lastLogin }),
                ...(result.createdAt && { createdAt: result.createdAt }),
            },
            statusCode: 200,
            metadata: {
                processedAt: new Date().toISOString(),
                responseTime,
                cacheHit: fromCache,
                fallbackUsed: fromFallback,
            },
        };
        if (responseTime > 1000) {
            console.log(`🐌 [SLOW_EMAIL_CHECK] ${email} - ${responseTime}ms`);
        }
        return response;
    }
    buildErrorResponse(email, error, code, statusCode, startTime) {
        const responseTime = Date.now() - startTime;
        return {
            success: false,
            error,
            code,
            statusCode,
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            metadata: {
                email,
                processedAt: new Date().toISOString(),
                responseTime,
            },
        };
    }
    determineAccountStatus(status, isActive) {
        const statusMap = {
            [user_roles_1.UserStatus.ACTIVE]: true,
            [user_roles_1.UserStatus.VERIFIED]: true,
            [user_roles_1.UserStatus.ONBOARDING]: true,
            [user_roles_1.UserStatus.PROFILE_SETUP]: true,
            [user_roles_1.UserStatus.TRIAL]: true,
            [user_roles_1.UserStatus.INACTIVE]: false,
            [user_roles_1.UserStatus.SUSPENDED]: false,
            [user_roles_1.UserStatus.PENDING]: false,
            [user_roles_1.UserStatus.PENDING_VERIFICATION]: false,
            [user_roles_1.UserStatus.BLOCKED]: false,
            [user_roles_1.UserStatus.DELETED]: false,
            [user_roles_1.UserStatus.PAYMENT_PENDING]: false,
            [user_roles_1.UserStatus.EXPIRED]: false,
        };
        return statusMap[status] ?? (isActive || false);
    }
    getReasonMessage(exists, isActive, userType, status) {
        if (!exists)
            return "Email disponível para registro";
        if (!isActive) {
            const type = userType ? userType.toLowerCase() : "de usuário";
            const statusMsg = status ? ` (status: ${status})` : "";
            return `Conta ${type} existe mas está inativa${statusMsg}`;
        }
        const type = userType ? userType.toLowerCase() : "de usuário";
        const statusMsg = status ? ` (status: ${status})` : "";
        return `Conta ${type} já está ativa e em uso${statusMsg}`;
    }
    getFromCache(email) {
        const cacheKey = email.toLowerCase().trim();
        const item = this.cache.get(cacheKey);
        if (item && Date.now() < item.expiry) {
            item.hits++;
            return item.data;
        }
        if (item) {
            this.cache.delete(cacheKey);
        }
        return undefined;
    }
    setToCache(email, data, ttl = this.DEFAULT_CACHE_TTL) {
        const cacheKey = email.toLowerCase().trim();
        this.cache.set(cacheKey, {
            data,
            expiry: Date.now() + ttl,
            hits: 0,
        });
    }
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            for (const [key, value] of this.cache.entries()) {
                if (now >= value.expiry) {
                    this.cache.delete(key);
                    cleaned++;
                }
            }
            if (cleaned > 0) {
                console.log(`🧹 [CACHE_CLEANUP] Removidos ${cleaned} itens expirados`);
            }
        }, this.CACHE_CLEANUP_INTERVAL);
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async withTimeout(promise, timeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout excedido")), timeout);
        });
        return Promise.race([promise, timeoutPromise]);
    }
    async getFallbackResult(email, error) {
        const cached = this.getFromCache(email);
        if (cached) {
            return {
                ...cached,
                exists: cached.exists,
                isActive: cached.isActive,
            };
        }
        return {
            exists: false,
            isActive: false,
            userType: undefined,
            status: undefined,
        };
    }
    clearCache(email) {
        if (email) {
            const cacheKey = email.toLowerCase().trim();
            this.cache.delete(cacheKey);
        }
        else {
            this.cache.clear();
        }
    }
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        let totalHits = 0;
        const entries = [];
        for (const [key, value] of this.cache.entries()) {
            const isExpired = now >= value.expiry;
            const age = now - (value.expiry - this.DEFAULT_CACHE_TTL);
            const expiresIn = value.expiry - now;
            if (!isExpired) {
                validEntries++;
                totalHits += value.hits;
                entries.push({
                    email: key,
                    exists: value.data.exists,
                    isActive: value.data.isActive,
                    userType: value.data.userType,
                    hits: value.hits,
                    age,
                    expiresIn,
                });
            }
            else {
                expiredEntries++;
            }
        }
        return {
            size: this.cache.size,
            valid: validEntries,
            expired: expiredEntries,
            totalHits,
            averageHits: validEntries > 0 ? totalHits / validEntries : 0,
            ttl: this.DEFAULT_CACHE_TTL,
            entries,
        };
    }
    getStatusInfo(status) {
        const statusInfo = {
            [user_roles_1.UserStatus.ACTIVE]: {
                isActive: true,
                description: "Conta ativa e funcionando normalmente",
            },
            [user_roles_1.UserStatus.INACTIVE]: {
                isActive: false,
                description: "Conta inativa - precisa ser reativada",
            },
            [user_roles_1.UserStatus.SUSPENDED]: {
                isActive: false,
                description: "Conta suspensa temporariamente",
            },
            [user_roles_1.UserStatus.PENDING]: {
                isActive: false,
                description: "Aguardando aprovação",
            },
            [user_roles_1.UserStatus.PENDING_VERIFICATION]: {
                isActive: false,
                description: "Aguardando verificação de email",
            },
            [user_roles_1.UserStatus.VERIFIED]: {
                isActive: true,
                description: "Email verificado - conta ativa",
            },
            [user_roles_1.UserStatus.BLOCKED]: {
                isActive: false,
                description: "Conta bloqueada por violação de termos",
            },
            [user_roles_1.UserStatus.DELETED]: { isActive: false, description: "Conta excluída" },
            [user_roles_1.UserStatus.ONBOARDING]: {
                isActive: true,
                description: "Em processo de onboarding",
            },
            [user_roles_1.UserStatus.PROFILE_SETUP]: {
                isActive: true,
                description: "Configurando perfil",
            },
            [user_roles_1.UserStatus.PAYMENT_PENDING]: {
                isActive: false,
                description: "Aguardando pagamento",
            },
            [user_roles_1.UserStatus.TRIAL]: {
                isActive: true,
                description: "Período de trial ativo",
            },
            [user_roles_1.UserStatus.EXPIRED]: { isActive: false, description: "Conta expirada" },
        };
        return (statusInfo[status] || {
            isActive: false,
            description: "Status desconhecido",
        });
    }
}
exports.EmailVerificationService = EmailVerificationService;
