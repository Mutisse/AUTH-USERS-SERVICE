"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const Admin_service_1 = require("../../../services/user/admin/Admin.service");
const UserBase_controller_1 = require("../base/UserBase.controller");
const user_roles_1 = require("../../../models/interfaces/user.roles");
const AppError_1 = require("../../../utils/AppError");
class AdminController extends UserBase_controller_1.UserBaseController {
    constructor() {
        super();
        this.userService = new Admin_service_1.AdminService();
        this.userType = "Admin";
        this.flowType = "admin_registration";
        this.updatePermissions = async (req, res, next) => {
            try {
                const { adminId } = req.params;
                const { permissions } = req.body;
                if (!Array.isArray(permissions)) {
                    throw new AppError_1.AppError("Permissões devem ser uma lista", 400, "INVALID_PERMISSIONS");
                }
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.updatePermissions(adminId, permissions);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.updateAccessLevel = async (req, res, next) => {
            try {
                const { adminId } = req.params;
                const { accessLevel } = req.body;
                const validAccessLevels = ["full", "limited", "readonly"];
                if (!accessLevel || !validAccessLevels.includes(accessLevel)) {
                    throw new AppError_1.AppError("Nível de acesso inválido", 400, "INVALID_ACCESS_LEVEL");
                }
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.updateAccessLevel(adminId, accessLevel);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.listAdmins = async (req, res, next) => {
            try {
                const { page = 1, limit = 10, search, accessLevel } = req.query;
                const result = await this.userService.listAdmins({
                    page: Number(page),
                    limit: Number(limit),
                    search: search,
                    accessLevel: accessLevel,
                });
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.updateAdminStatus = async (req, res, next) => {
            try {
                const { adminId } = req.params;
                const { status } = req.body;
                if (!status || typeof status !== "string") {
                    throw new AppError_1.AppError("Status é obrigatório", 400, "INVALID_STATUS");
                }
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.updateAdminStatus(adminId, status);
                if (!result.success) {
                    return res.status(result.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.recordSystemAccess = async (req, res, next) => {
            try {
                const adminId = req.user?.id;
                if (!adminId) {
                    throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHORIZED");
                }
                const result = await this.userService.recordSystemAccess(adminId);
                return res.status(result.statusCode || 200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getSystemStats = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.getAllUsers = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.getUserById = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.updateUserStatus = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.deleteUser = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.activateAccount = async (req, res, next) => {
            try {
                const { userId } = req.params;
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.deactivateAccount = async (req, res, next) => {
            try {
                const { userId } = req.params;
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.createBackup = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.getSystemLogs = async (req, res, next) => {
            try {
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                return res.status(501).json({
                    success: false,
                    error: "Método não implementado",
                    code: "NOT_IMPLEMENTED"
                });
            }
            catch (error) {
                return next(error);
            }
        };
    }
    async validateSpecificData(data) {
        return null;
    }
    getDefaultStatus() {
        return user_roles_1.UserStatus.ACTIVE;
    }
    getAdditionalRegistrationData(data) {
        return {
            adminData: {
                permissions: data.adminData?.permissions || ['read', 'write'],
                accessLevel: data.adminData?.accessLevel || 'basic',
                lastSystemAccess: new Date(),
                isSuperAdmin: data.adminData?.isSuperAdmin || false
            }
        };
    }
    getAdditionalStartRegistrationData(data) {
        return {};
    }
    checkAuthorization(currentUser, targetUserId) {
        if (!currentUser)
            return false;
        return currentUser.role === 'admin_system';
    }
    unauthorizedResponse() {
        return {
            success: false,
            error: "Acesso restrito a administradores do sistema",
            code: "ADMIN_ACCESS_REQUIRED"
        };
    }
}
exports.AdminController = AdminController;
