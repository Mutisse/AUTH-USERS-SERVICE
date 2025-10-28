"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserBase_service_1 = require("../base/UserBase.service");
const Client_model_1 = require("../../../models/user/client/Client.model");
const user_roles_1 = require("../../../models/interfaces/user.roles");
const generateCustomUserId_1 = require("../../../utils/generateCustomUserId");
class ClientService extends UserBase_service_1.UserBaseService {
    constructor() {
        super(...arguments);
        this.userModel = Client_model_1.ClientModel;
    }
    mapToSessionUser(client) {
        return {
            id: client._id.toString(),
            email: client.email,
            role: client.role,
            isVerified: client.isVerified,
            isActive: client.isActive,
            status: client.status,
            fullName: client.fullName,
            lastLogin: client.lastLogin,
            clientData: {
                loyaltyPoints: client.clientData?.loyaltyPoints || 0,
                totalAppointments: client.clientData?.totalAppointments || 0,
                lastVisit: client.clientData?.lastVisit,
            },
        };
    }
    enrichUserData(client) {
        return {
            ...this.mapToSessionUser(client),
            phoneNumber: client.phoneNumber,
            birthDate: client.birthDate,
            gender: client.gender,
            address: client.address,
            preferences: client.preferences,
            clientData: client.clientData,
            acceptTerms: client.acceptTerms,
            emailVerifiedAt: client.emailVerifiedAt,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
        };
    }
    async createSpecificUser(clientData) {
        try {
            console.log("🎯 Criando cliente com dados:", {
                email: clientData.email,
                firstName: clientData.fullName?.firstName,
                acceptTerms: clientData.acceptTerms,
            });
            if (!clientData.fullName?.firstName) {
                return this.errorResponse("Nome é obrigatório", "INVALID_NAME", 400);
            }
            if (!clientData.acceptTerms) {
                return this.errorResponse("Termos devem ser aceitos", "TERMS_NOT_ACCEPTED", 400);
            }
            if (!(await this.isEmailAvailable(clientData.email))) {
                return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
            }
            const clientId = (0, generateCustomUserId_1.generateUserId)();
            const hashedPassword = await bcryptjs_1.default.hash(clientData.password, 12);
            const newClient = await Client_model_1.ClientModel.create({
                _id: clientId,
                email: clientData.email.toLowerCase().trim(),
                password: hashedPassword,
                role: user_roles_1.UserMainRole.CLIENT,
                status: clientData.status || user_roles_1.UserStatus.PENDING_VERIFICATION,
                isActive: clientData.isActive !== undefined ? clientData.isActive : false,
                isVerified: clientData.isVerified !== undefined ? clientData.isVerified : false,
                fullName: {
                    firstName: clientData.fullName.firstName.trim(),
                    lastName: clientData.fullName.lastName?.trim() || "",
                    displayName: `${clientData.fullName.firstName.trim()} ${clientData.fullName.lastName?.trim() || ""}`.trim(),
                },
                phoneNumber: clientData.phoneNumber?.trim(),
                acceptTerms: clientData.acceptTerms,
                clientData: {
                    loyaltyPoints: 0,
                    totalAppointments: 0,
                    preferences: {
                        favoriteServices: [],
                        preferredStylists: [],
                        allergyNotes: "",
                        specialRequirements: "",
                    },
                },
                preferences: {
                    theme: "light",
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
            console.log(`✅ Cliente criado: ${newClient._id}`);
            const clientResponse = this.enrichUserData(newClient);
            return this.successResponse({
                user: clientResponse,
                tokens: clientResponse.status === user_roles_1.UserStatus.ACTIVE
                    ? {
                        accessToken: `eyJ_cliente_${Date.now()}`,
                        refreshToken: `eyJ_refresh_cliente_${Date.now()}`,
                        expiresIn: 3600,
                    }
                    : undefined,
            }, 201, clientResponse.status === user_roles_1.UserStatus.ACTIVE
                ? "Cliente criado com sucesso"
                : "Cliente criado - aguardando verificação de email");
        }
        catch (error) {
            console.error("[ClientService] Erro ao criar cliente:", error);
            return this.errorResponse("Erro ao criar cliente", "CREATE_CLIENT_ERROR", 500, error);
        }
    }
    async createClient(clientData) {
        return this.createSpecificUser(clientData);
    }
    async activateAccount(clientId) {
        try {
            const client = await Client_model_1.ClientModel.findById(clientId);
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            client.isVerified = true;
            client.isActive = true;
            client.status = user_roles_1.UserStatus.ACTIVE;
            client.emailVerifiedAt = new Date();
            await client.save();
            console.log(`✅ Conta ativada: ${client._id}`);
            return this.successResponse(this.enrichUserData(client), 200, "Conta ativada com sucesso");
        }
        catch (error) {
            return this.errorResponse("Erro ao ativar conta", "ACTIVATION_ERROR", 500, error);
        }
    }
    async verifyEmail(token) {
        try {
            console.log(`🔐 Verificando email com token: ${token}`);
            const client = await Client_model_1.ClientModel.findOne({
                status: user_roles_1.UserStatus.PENDING_VERIFICATION,
            });
            if (!client) {
                return this.errorResponse("Token inválido ou expirado", "INVALID_TOKEN", 400);
            }
            client.isVerified = true;
            client.isActive = true;
            client.status = user_roles_1.UserStatus.ACTIVE;
            client.emailVerifiedAt = new Date();
            await client.save();
            console.log(`✅ Conta ativada: ${client._id}`);
            return this.successResponse(this.enrichUserData(client), 200, "Email verificado e conta ativada com sucesso");
        }
        catch (error) {
            console.error("[ClientService] Erro ao verificar email:", error);
            return this.errorResponse("Erro ao verificar email", "EMAIL_VERIFICATION_ERROR", 500, error);
        }
    }
    async getClientPublicProfile(clientId) {
        try {
            const client = await Client_model_1.ClientModel.findById(clientId).select("fullName profileImage clientData createdAt isVerified");
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            const publicProfile = {
                id: client._id.toString(),
                fullName: client.fullName,
                profileImage: client.profileImage,
                clientData: {
                    loyaltyPoints: client.clientData?.loyaltyPoints || 0,
                    totalAppointments: client.clientData?.totalAppointments || 0,
                    memberSince: client.createdAt,
                },
                badges: this.getClientBadges(client),
                activityStats: {
                    totalReviews: 0,
                    joinedDate: client.createdAt,
                    isVerified: client.isVerified,
                },
            };
            return this.successResponse(publicProfile);
        }
        catch (error) {
            return this.errorResponse("Erro ao buscar perfil público", "GET_PUBLIC_PROFILE_ERROR", 500, error);
        }
    }
    async searchClientsPublic(searchTerm, options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;
            if (!searchTerm || searchTerm.trim().length < 2) {
                return this.errorResponse("Termo de busca deve ter pelo menos 2 caracteres", "INVALID_SEARCH_TERM", 400);
            }
            const query = {
                role: user_roles_1.UserMainRole.CLIENT,
                $or: [
                    { "fullName.firstName": { $regex: searchTerm, $options: "i" } },
                    { "fullName.lastName": { $regex: searchTerm, $options: "i" } },
                    { "fullName.displayName": { $regex: searchTerm, $options: "i" } },
                ],
                isActive: true,
                status: user_roles_1.UserStatus.ACTIVE,
            };
            const clients = await Client_model_1.ClientModel.find(query)
                .select("fullName profileImage clientData createdAt isVerified")
                .skip(skip)
                .limit(limit)
                .sort({ "fullName.displayName": 1 });
            const total = await Client_model_1.ClientModel.countDocuments(query);
            const publicClients = clients.map((client) => ({
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
            return this.successResponse({
                clients: publicClients,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
                searchTerm: searchTerm.trim(),
            });
        }
        catch (error) {
            return this.errorResponse("Erro ao buscar clientes", "SEARCH_CLIENTS_ERROR", 500, error);
        }
    }
    async updateLoyaltyPoints(clientId, points) {
        try {
            const client = await Client_model_1.ClientModel.findByIdAndUpdate(clientId, { $inc: { "clientData.loyaltyPoints": points } }, { new: true });
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            return this.successResponse({
                loyaltyPoints: client.clientData.loyaltyPoints,
                totalPoints: client.clientData.loyaltyPoints,
            });
        }
        catch (error) {
            return this.errorResponse("Erro ao atualizar pontos", "UPDATE_LOYALTY_ERROR", 500, error);
        }
    }
    async recordAppointment(clientId) {
        try {
            const client = await Client_model_1.ClientModel.findByIdAndUpdate(clientId, {
                $inc: { "clientData.totalAppointments": 1 },
                $set: { "clientData.lastVisit": new Date() },
            }, { new: true });
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            return this.successResponse({
                totalAppointments: client.clientData.totalAppointments,
                lastVisit: client.clientData.lastVisit,
            });
        }
        catch (error) {
            return this.errorResponse("Erro ao registrar atendimento", "RECORD_APPOINTMENT_ERROR", 500, error);
        }
    }
    async updatePreferences(clientId, preferences) {
        try {
            const client = await Client_model_1.ClientModel.findByIdAndUpdate(clientId, { $set: { preferences } }, { new: true }).select("-password");
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            return this.successResponse(this.enrichUserData(client));
        }
        catch (error) {
            return this.errorResponse("Erro ao atualizar preferências", "UPDATE_PREFERENCES_ERROR", 500, error);
        }
    }
    async listClients(options) {
        try {
            const { page, limit, search } = options;
            const skip = (page - 1) * limit;
            let query = { role: user_roles_1.UserMainRole.CLIENT };
            if (search) {
                query.$or = [
                    { email: { $regex: search, $options: "i" } },
                    { "fullName.firstName": { $regex: search, $options: "i" } },
                    { "fullName.lastName": { $regex: search, $options: "i" } },
                ];
            }
            const clients = await Client_model_1.ClientModel.find(query)
                .select("-password")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });
            const total = await Client_model_1.ClientModel.countDocuments(query);
            return this.successResponse({
                clients: clients.map((client) => this.enrichUserData(client)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            console.error("[ClientService] Erro ao listar clientes:", error);
            return this.errorResponse("Erro ao listar clientes", "LIST_CLIENTS_ERROR", 500, error);
        }
    }
    async updateClientStatus(clientId, status) {
        try {
            const validStatuses = Object.values(user_roles_1.UserStatus);
            if (!validStatuses.includes(status)) {
                return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
            }
            const client = await Client_model_1.ClientModel.findByIdAndUpdate(clientId, {
                $set: {
                    status,
                    isActive: status === user_roles_1.UserStatus.ACTIVE,
                    ...(status !== user_roles_1.UserStatus.ACTIVE && { deactivatedAt: new Date() }),
                },
            }, { new: true, runValidators: true }).select("-password");
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            return this.successResponse(this.enrichUserData(client), 200, `Status do cliente atualizado para ${status}`);
        }
        catch (error) {
            console.error("[ClientService] Erro ao atualizar status:", error);
            return this.errorResponse("Erro ao atualizar status", "UPDATE_STATUS_ERROR", 500, error);
        }
    }
    async getClientById(clientId) {
        try {
            const client = await Client_model_1.ClientModel.findById(clientId).select("-password");
            if (!client) {
                return this.errorResponse("Cliente não encontrado", "CLIENT_NOT_FOUND", 404);
            }
            return this.successResponse(this.enrichUserData(client));
        }
        catch (error) {
            return this.errorResponse("Erro ao buscar cliente", "GET_CLIENT_ERROR", 500, error);
        }
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
    async isEmailAvailable(email) {
        const client = await Client_model_1.ClientModel.findOne({
            email: email.toLowerCase().trim(),
        });
        return !client;
    }
}
exports.ClientService = ClientService;
