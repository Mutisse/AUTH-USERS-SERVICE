"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitLogger = exports.checkRateLimit = exports.developmentSkipLimit = exports.adminRateLimit = exports.apiRateLimit = exports.registrationRateLimit = exports.emailVerificationRateLimit = exports.otpRateLimit = exports.authRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.otpRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Muitas solicitações de OTP. Tente novamente em 5 minutos.',
        code: 'OTP_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.emailVerificationRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Muitas verificações de email. Tente novamente em 10 minutos.',
        code: 'EMAIL_VERIFICATION_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.registrationRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
        code: 'REGISTRATION_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.apiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Muitas requisições para a API. Tente novamente em 15 minutos.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Limite de requisições administrativas excedido.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const developmentSkipLimit = (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    return (0, exports.apiRateLimit)(req, res, next);
};
exports.developmentSkipLimit = developmentSkipLimit;
const checkRateLimit = (req) => {
    return true;
};
exports.checkRateLimit = checkRateLimit;
const rateLimitLogger = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    console.log(`📊 Rate Limit Check - IP: ${clientIP}, Path: ${req.path}`);
    next();
};
exports.rateLimitLogger = rateLimitLogger;
exports.default = {
    authRateLimit: exports.authRateLimit,
    otpRateLimit: exports.otpRateLimit,
    emailVerificationRateLimit: exports.emailVerificationRateLimit,
    registrationRateLimit: exports.registrationRateLimit,
    apiRateLimit: exports.apiRateLimit,
    adminRateLimit: exports.adminRateLimit,
    developmentSkipLimit: exports.developmentSkipLimit
};
