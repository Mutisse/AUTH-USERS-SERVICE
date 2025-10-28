"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientController = void 0;
const Client_service_1 = require("../../../services/user/client/Client.service");
const Client_model_1 = require("../../../models/user/client/Client.model");
const UserBase_controller_1 = require("../base/UserBase.controller");
const user_roles_1 = require("../../../models/interfaces/user.roles");
const AppError_1 = require("../../../utils/AppError");
class ClientController extends UserBase_controller_1.UserBaseController {
    constructor() {
        super();
        this.userService = new Client_service_1.ClientService();
        this.userType = "Cliente";
        this.flowType = "client_registration";
        this.verifyEmail = async (req, res, next) => {
            try {
                const { token } = req.params;
                const result = await this.userService.verifyEmail(token);
                if (!result.success) {
                    const errorResult = result;
                    throw new AppError_1.AppError(errorResult.error || "Token inválido ou expirado", 400, "INVALID_TOKEN");
                }
                res.json({
                    success: true,
                    message: "Email verificado com sucesso! Sua conta foi ativada.",
                    data: result.data,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updatePreferences = async (req, res, next) => {
            try {
                const clientId = req.user?.id;
                const { preferences } = req.body;
                if (!clientId) {
                    throw new AppError_1.AppError("Não autenticado", 401, "UNAUTHORIZED");
                }
                if (!preferences || typeof preferences !== "object") {
                    throw new AppError_1.AppError("Preferências devem ser um objeto válido", 400, "INVALID_PREFERENCES");
                }
                const result = await this.userService.updatePreferences(clientId, preferences);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.updateLoyaltyPoints = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const { points } = req.body;
                if (typeof points !== "number") {
                    throw new AppError_1.AppError("Pontos devem ser um número", 400, "INVALID_POINTS");
                }
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser, clientId)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.updateLoyaltyPoints(clientId, points);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.recordAppointment = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser, clientId)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.recordAppointment(clientId);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getClientPublicProfile = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const result = await this.userService.getClientPublicProfile(clientId);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 404).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.searchClients = async (req, res, next) => {
            try {
                const { search, page = 1, limit = 10 } = req.query;
                if (!search || typeof search !== "string") {
                    return res.status(400).json({
                        success: false,
                        error: "Termo de busca é obrigatório",
                        code: "MISSING_SEARCH_TERM",
                    });
                }
                const result = await this.userService.searchClientsPublic(search, {
                    page: Number(page),
                    limit: Number(limit),
                });
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getFeaturedClients = async (req, res, next) => {
            try {
                const { limit = 8 } = req.query;
                const featuredClients = await Client_model_1.ClientModel.find({
                    role: "client",
                    isActive: true,
                    status: user_roles_1.UserStatus.ACTIVE,
                })
                    .select("fullName profileImage clientData createdAt isVerified")
                    .sort({
                    "clientData.loyaltyPoints": -1,
                    "clientData.totalAppointments": -1,
                })
                    .limit(Number(limit));
                const publicClients = featuredClients.map((client) => ({
                    id: client._id.toString(),
                    fullName: client.fullName,
                    profileImage: client.profileImage,
                    clientData: {
                        loyaltyPoints: client.clientData?.loyaltyPoints || 0,
                        totalAppointments: client.clientData?.totalAppointments || 0,
                        memberSince: client.createdAt,
                    },
                    badges: this.getClientBadges(client),
                }));
                return res.status(200).json({
                    success: true,
                    data: {
                        clients: publicClients,
                        total: publicClients.length,
                    },
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.listClients = async (req, res, next) => {
            try {
                const { page = 1, limit = 10, search } = req.query;
                const result = await this.userService.listClients({
                    page: Number(page),
                    limit: Number(limit),
                    search: search,
                });
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.updateClientStatus = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const { status } = req.body;
                if (!status || typeof status !== "string") {
                    throw new AppError_1.AppError("Status é obrigatório", 400, "INVALID_STATUS");
                }
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser, clientId)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.updateClientStatus(clientId, status);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.deleteClient = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const deletedBy = req.user?.id;
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser, clientId)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.softDeleteUser(clientId, deletedBy);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.restoreClient = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser, clientId)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.restoreUser(clientId);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        this.hardDeleteClient = async (req, res, next) => {
            try {
                const { clientId } = req.params;
                const currentUser = req.user;
                if (!this.checkAuthorization(currentUser, clientId)) {
                    return res.status(403).json(this.unauthorizedResponse());
                }
                const result = await this.userService.hardDeleteUser(clientId);
                if (!result.success) {
                    const errorResult = result;
                    return res.status(errorResult.statusCode || 400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                return next(error);
            }
        };
        console.log("🎯 ClientController initialized - Register method available:", !!this.register);
    }
    async validateSpecificData(data) {
        return null;
    }
    getDefaultStatus() {
        return user_roles_1.UserStatus.VERIFIED;
    }
    getAdditionalRegistrationData(data) {
        return {
            clientData: {
                loyaltyPoints: 0,
                totalAppointments: 0,
                preferences: data.preferences || {},
                communicationPreferences: data.communicationPreferences || {
                    email: true,
                    sms: false,
                    push: true,
                },
            },
        };
    }
    getAdditionalStartRegistrationData(data) {
        return {};
    }
    checkAuthorization(currentUser, targetUserId) {
        if (!currentUser)
            return false;
        if (currentUser.role === "admin_system")
            return true;
        if (currentUser.role === "employee")
            return true;
        if (currentUser.role === "client") {
            return currentUser.id === targetUserId;
        }
        return false;
    }
    unauthorizedResponse() {
        return {
            success: false,
            error: "Não autorizado",
            code: "UNAUTHORIZED_ACCESS",
        };
    }
    getClientBadges(client) {
        const badges = [];
        if (client.isVerified) {
            badges.push("verified");
        }
        const loyaltyPoints = client.clientData?.loyaltyPoints || 0;
        if (loyaltyPoints >= 1000) {
            badges.push("vip");
        }
        else if (loyaltyPoints >= 500) {
            badges.push("regular");
        }
        else if (loyaltyPoints >= 100) {
            badges.push("newbie");
        }
        const totalAppointments = client.clientData?.totalAppointments || 0;
        if (totalAppointments >= 50) {
            badges.push("frequent_visitor");
        }
        else if (totalAppointments >= 10) {
            badges.push("active_client");
        }
        return badges;
    }
}
exports.ClientController = ClientController;
