"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserBase_service_1 = require("../base/UserBase.service");
const Admin_model_1 = require("../../../models/user/admin/Admin.model");
const user_roles_1 = require("../../../models/interfaces/user.roles");
const generateCustomUserId_1 = require("../../../utils/generateCustomUserId");
class AdminService extends UserBase_service_1.UserBaseService {
    constructor() {
        super(...arguments);
        this.userModel = Admin_model_1.AdminModel;
    }
    mapToSessionUser(admin) {
        return {
            id: admin._id.toString(),
            email: admin.email,
            role: admin.role,
            isVerified: admin.isVerified,
            isActive: admin.isActive,
            status: admin.status,
            fullName: admin.fullName,
            lastLogin: admin.lastLogin,
            adminData: {
                permissions: admin.adminData?.permissions || [],
                accessLevel: admin.adminData?.accessLevel || "limited",
                managedUsers: admin.adminData?.managedUsers || 0,
                systemNotifications: admin.adminData?.systemNotifications || false,
            },
        };
    }
    enrichUserData(admin) {
        return {
            ...this.mapToSessionUser(admin),
            phoneNumber: admin.phoneNumber,
            birthDate: admin.birthDate,
            gender: admin.gender,
            address: admin.address,
            preferences: admin.preferences,
            adminData: admin.adminData,
            acceptTerms: admin.acceptTerms,
            emailVerifiedAt: admin.emailVerifiedAt,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
        };
    }
    async createSpecificUser(adminData) {
        try {
            console.log("🎯 Criando admin com dados:", {
                email: adminData.email,
                firstName: adminData.fullName?.firstName,
                acceptTerms: adminData.acceptTerms,
            });
            if (!adminData.fullName?.firstName) {
                return this.errorResponse("Nome é obrigatório", "INVALID_NAME", 400);
            }
            if (!adminData.acceptTerms) {
                return this.errorResponse("Termos devem ser aceitos", "TERMS_NOT_ACCEPTED", 400);
            }
            if (!(await this.isEmailAvailable(adminData.email))) {
                return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
            }
            const adminId = (0, generateCustomUserId_1.generateUserId)();
            const hashedPassword = await bcryptjs_1.default.hash(adminData.password, 12);
            const newAdmin = await Admin_model_1.AdminModel.create({
                _id: adminId,
                email: adminData.email.toLowerCase().trim(),
                password: hashedPassword,
                role: user_roles_1.UserMainRole.ADMINSYSTEM,
                status: adminData.status || user_roles_1.UserStatus.ACTIVE,
                isActive: adminData.isActive !== undefined ? adminData.isActive : true,
                isVerified: adminData.isVerified !== undefined ? adminData.isVerified : true,
                fullName: {
                    firstName: adminData.fullName.firstName.trim(),
                    lastName: adminData.fullName.lastName?.trim() || "",
                    displayName: `${adminData.fullName.firstName.trim()} ${adminData.fullName.lastName?.trim() || ""}`.trim(),
                },
                phoneNumber: adminData.phoneNumber?.trim(),
                acceptTerms: adminData.acceptTerms,
                adminData: {
                    permissions: adminData.adminData?.permissions || ["read", "write"],
                    accessLevel: adminData.adminData?.accessLevel || "limited",
                    managedUsers: 0,
                    systemNotifications: true,
                    lastSystemAccess: new Date(),
                },
                preferences: {
                    theme: "dark",
                    notifications: {
                        email: true,
                        push: true,
                        sms: false,
                        whatsapp: false,
                    },
                    language: "pt-MZ",
                    timezone: "UTC",
                },
            });
            console.log(`✅ Admin criado: ${newAdmin._id}`);
            const adminResponse = this.enrichUserData(newAdmin);
            return this.successResponse({
                user: adminResponse,
                tokens: {
                    accessToken: `eyJ_admin_${Date.now()}`,
                    refreshToken: `eyJ_refresh_admin_${Date.now()}`,
                    expiresIn: 3600,
                },
            }, 201, "Admin criado com sucesso");
        }
        catch (error) {
            console.error("[AdminService] Erro ao criar admin:", error);
            return this.errorResponse("Erro ao criar admin", "CREATE_ADMIN_ERROR", 500, error);
        }
    }
    async createAdmin(adminData) {
        return this.createSpecificUser(adminData);
    }
    async activateAccount(adminId) {
        try {
            const admin = await Admin_model_1.AdminModel.findById(adminId);
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            admin.isVerified = true;
            admin.isActive = true;
            admin.status = user_roles_1.UserStatus.ACTIVE;
            admin.emailVerifiedAt = new Date();
            await admin.save();
            console.log(`✅ Conta ativada: ${admin._id}`);
            return this.successResponse(this.enrichUserData(admin), 200, "Conta ativada com sucesso");
        }
        catch (error) {
            return this.errorResponse("Erro ao ativar conta", "ACTIVATION_ERROR", 500, error);
        }
    }
    async updatePermissions(adminId, permissions) {
        try {
            const admin = await Admin_model_1.AdminModel.findByIdAndUpdate(adminId, { $set: { "adminData.permissions": permissions } }, { new: true });
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            return this.successResponse({
                permissions: admin.adminData.permissions,
                message: "Permissões atualizadas",
            });
        }
        catch (error) {
            return this.errorResponse("Erro ao atualizar permissões", "UPDATE_PERMISSIONS_ERROR", 500, error);
        }
    }
    async updateAccessLevel(adminId, accessLevel) {
        try {
            const validAccessLevels = ["full", "limited", "readonly"];
            if (!validAccessLevels.includes(accessLevel)) {
                return this.errorResponse("Nível de acesso inválido", "INVALID_ACCESS_LEVEL", 400);
            }
            const admin = await Admin_model_1.AdminModel.findByIdAndUpdate(adminId, { $set: { "adminData.accessLevel": accessLevel } }, { new: true });
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            return this.successResponse({
                accessLevel: admin.adminData.accessLevel,
                message: "Nível de acesso atualizado",
            });
        }
        catch (error) {
            return this.errorResponse("Erro ao atualizar nível de acesso", "UPDATE_ACCESS_LEVEL_ERROR", 500, error);
        }
    }
    async recordSystemAccess(adminId) {
        try {
            const admin = await Admin_model_1.AdminModel.findByIdAndUpdate(adminId, {
                $set: { "adminData.lastSystemAccess": new Date() },
                $inc: { "adminData.managedUsers": 0 },
            }, { new: true });
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            return this.successResponse({
                lastSystemAccess: admin.adminData.lastSystemAccess,
                message: "Acesso ao sistema registrado",
            });
        }
        catch (error) {
            return this.errorResponse("Erro ao registrar acesso", "RECORD_ACCESS_ERROR", 500, error);
        }
    }
    async listAdmins(options) {
        try {
            const { page, limit, search, accessLevel } = options;
            const skip = (page - 1) * limit;
            let query = { role: user_roles_1.UserMainRole.ADMINSYSTEM };
            if (search) {
                query.$or = [
                    { email: { $regex: search, $options: "i" } },
                    { "fullName.firstName": { $regex: search, $options: "i" } },
                    { "fullName.lastName": { $regex: search, $options: "i" } },
                ];
            }
            if (accessLevel) {
                query["adminData.accessLevel"] = accessLevel;
            }
            const admins = await Admin_model_1.AdminModel.find(query)
                .select("-password")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });
            const total = await Admin_model_1.AdminModel.countDocuments(query);
            return this.successResponse({
                admins: admins.map((admin) => this.enrichUserData(admin)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            console.error("[AdminService] Erro ao listar admins:", error);
            return this.errorResponse("Erro ao listar admins", "LIST_ADMINS_ERROR", 500, error);
        }
    }
    async updateAdminStatus(adminId, status) {
        try {
            const validStatuses = Object.values(user_roles_1.UserStatus);
            if (!validStatuses.includes(status)) {
                return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
            }
            const admin = await Admin_model_1.AdminModel.findByIdAndUpdate(adminId, {
                $set: {
                    status,
                    isActive: status === user_roles_1.UserStatus.ACTIVE,
                    ...(status !== user_roles_1.UserStatus.ACTIVE && { deactivatedAt: new Date() }),
                },
            }, { new: true, runValidators: true }).select("-password");
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            return this.successResponse(this.enrichUserData(admin), 200, `Status do admin atualizado para ${status}`);
        }
        catch (error) {
            console.error("[AdminService] Erro ao atualizar status:", error);
            return this.errorResponse("Erro ao atualizar status", "UPDATE_STATUS_ERROR", 500, error);
        }
    }
    async isEmailAvailable(email) {
        const admin = await Admin_model_1.AdminModel.findOne({
            email: email.toLowerCase().trim(),
        });
        return !admin;
    }
    async findByEmail(email) {
        try {
            const admin = await Admin_model_1.AdminModel.findOne({
                email: email.toLowerCase().trim(),
            }).select("-password");
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            return this.successResponse(this.enrichUserData(admin));
        }
        catch (error) {
            console.error("[AdminService] Erro ao buscar admin:", error);
            return this.errorResponse("Erro ao buscar admin", "FIND_ADMIN_ERROR", 500, error);
        }
    }
    async updateAdmin(adminId, updateData) {
        try {
            const admin = await Admin_model_1.AdminModel.findByIdAndUpdate(adminId, { $set: updateData }, { new: true, runValidators: true }).select("-password");
            if (!admin) {
                return this.errorResponse("Admin não encontrado", "ADMIN_NOT_FOUND", 404);
            }
            return this.successResponse(this.enrichUserData(admin), 200, "Admin atualizado com sucesso");
        }
        catch (error) {
            console.error("[AdminService] Erro ao atualizar admin:", error);
            return this.errorResponse("Erro ao atualizar admin", "UPDATE_ADMIN_ERROR", 500, error);
        }
    }
}
exports.AdminService = AdminService;
