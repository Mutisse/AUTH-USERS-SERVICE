"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaff = exports.requireClient = exports.requireEmployee = exports.requireAdmin = exports.requireVerification = exports.authorize = exports.authenticate = void 0;
const AppError_1 = require("../utils/AppError");
const user_roles_1 = require("../models/interfaces/user.roles");
const jwt_utils_1 = require("../utils/jwt.utils");
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            throw new AppError_1.AppError("Token de autenticação não fornecido", 401, "MISSING_TOKEN");
        }
        const payload = (0, jwt_utils_1.verifyToken)(token);
        if (payload.type !== "access") {
            throw new AppError_1.AppError("Tipo de token inválido", 401, "INVALID_TOKEN_TYPE");
        }
        req.user = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            subRole: payload.subRole,
            isVerified: payload.isVerified,
        };
        next();
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("expirado")) {
                throw new AppError_1.AppError("Token expirado", 401, "TOKEN_EXPIRED");
            }
            if (error.message.includes("inválido")) {
                throw new AppError_1.AppError("Token inválido", 401, "INVALID_TOKEN");
            }
        }
        next(new AppError_1.AppError("Erro de autenticação", 401, "AUTH_ERROR"));
    }
};
exports.authenticate = authenticate;
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHENTICATED");
            }
            if (!allowedRoles.includes(req.user.role)) {
                throw new AppError_1.AppError("Não autorizado para esta ação", 403, "UNAUTHORIZED");
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authorize = authorize;
const requireVerification = (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHENTICATED");
        }
        if (!req.user.isVerified) {
            throw new AppError_1.AppError("Email não verificado", 403, "EMAIL_NOT_VERIFIED");
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireVerification = requireVerification;
exports.requireAdmin = (0, exports.authorize)(user_roles_1.UserMainRole.ADMINSYSTEM);
exports.requireEmployee = (0, exports.authorize)(user_roles_1.UserMainRole.EMPLOYEE);
exports.requireClient = (0, exports.authorize)(user_roles_1.UserMainRole.CLIENT);
const requireStaff = (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHENTICATED");
        }
        if (req.user.role !== user_roles_1.UserMainRole.EMPLOYEE &&
            req.user.role !== user_roles_1.UserMainRole.ADMINSYSTEM) {
            throw new AppError_1.AppError("Acesso restrito a funcionários e administradores", 403, "STAFF_ONLY");
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireStaff = requireStaff;
