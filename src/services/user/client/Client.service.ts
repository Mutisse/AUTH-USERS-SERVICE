import bcrypt from "bcryptjs";
import { UserBaseService } from "../base/UserBase.service";
import { ClientModel } from "../../../models/user/client/Client.model";
import {
  UserMainRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import generateCustomUserId from "../../../utils/generateCustomUserId";

export class ClientService extends UserBaseService {
  // ✅ CORREÇÃO DEFINITIVA: Usar type assertion mais específica
  protected userModel = ClientModel as unknown as any;

  public async createClient(clientData: any) {
    try {
      console.log("🎯 Criando cliente com dados:", {
        email: clientData.email,
        firstName: clientData.fullName?.firstName,
        acceptTerms: clientData.acceptTerms,
        isVerified: clientData.isVerified,
      });

      // 🎯 VALIDAÇÕES
      if (!clientData.fullName?.firstName) {
        return this.errorResponse("Nome é obrigatório", "INVALID_NAME", 400);
      }

      if (!clientData.acceptTerms) {
        return this.errorResponse(
          "Termos devem ser aceitos",
          "TERMS_NOT_ACCEPTED",
          400
        );
      }

      if (!(await this.isEmailAvailable(clientData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      // 🎯 GERAR ID E HASH PASSWORD
      const clientId = generateCustomUserId(UserMainRole.CLIENT);
      const hashedPassword = await bcrypt.hash(clientData.password, 12);

      // 🎯 CRIAR CLIENTE NO MONGODB
      const newClient = await ClientModel.create({
        _id: clientId,
        email: clientData.email.toLowerCase().trim(),
        password: hashedPassword,
        role: UserMainRole.CLIENT,
        status: clientData.status || UserStatus.ACTIVE,
        isActive:
          clientData.isActive !== undefined ? clientData.isActive : true,
        isVerified:
          clientData.isVerified !== undefined ? clientData.isVerified : false,
        fullName: {
          firstName: clientData.fullName.firstName.trim(),
          lastName: clientData.fullName.lastName?.trim() || "",
          displayName: `${clientData.fullName.firstName.trim()} ${
            clientData.fullName.lastName?.trim() || ""
          }`.trim(),
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

      console.log(
        `✅ Cliente criado: ${newClient._id} com isVerified: ${newClient.isVerified}`
      );

      // 🎯 PREPARAR RESPOSTA
      const clientResponse = this.enrichUserData(newClient);

      return this.successResponse(
        {
          user: clientResponse,
          tokens: {
            accessToken: `eyJ_cliente_${Date.now()}`,
            refreshToken: `eyJ_refresh_cliente_${Date.now()}`,
            expiresIn: 3600,
          },
        },
        201,
        "Cliente criado com sucesso"
      );
    } catch (error) {
      console.error("[ClientService] Erro ao criar cliente:", error);
      return this.errorResponse(
        "Erro ao criar cliente",
        "CREATE_CLIENT_ERROR",
        500,
        error
      );
    }
  }

  public async updateLoyaltyPoints(clientId: string, points: number) {
    try {
      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        { $inc: { "clientData.loyaltyPoints": points } },
        { new: true }
      );

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        loyaltyPoints: client.clientData.loyaltyPoints,
        totalPoints: client.clientData.loyaltyPoints,
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar pontos",
        "UPDATE_LOYALTY_ERROR",
        500,
        error
      );
    }
  }

  public async recordAppointment(clientId: string) {
    try {
      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        {
          $inc: { "clientData.totalAppointments": 1 },
          $set: { "clientData.lastVisit": new Date() },
        },
        { new: true }
      );

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      return this.successResponse({
        totalAppointments: client.clientData.totalAppointments,
        lastVisit: client.clientData.lastVisit,
      });
    } catch (error) {
      return this.errorResponse(
        "Erro ao registrar atendimento",
        "RECORD_APPOINTMENT_ERROR",
        500,
        error
      );
    }
  }

  public async updateProfile(clientId: string, updates: any) {
    try {
      // Remover campos que não devem ser atualizados
      const { password, role, _id, ...safeUpdates } = updates;

      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        { $set: safeUpdates },
        { new: true, runValidators: true }
      ).select("-password");

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(client));
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar perfil",
        "UPDATE_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  public async updatePreferences(clientId: string, preferences: any) {
    try {
      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        { $set: { preferences } },
        { new: true }
      ).select("-password");

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(client));
    } catch (error) {
      return this.errorResponse(
        "Erro ao atualizar preferências",
        "UPDATE_PREFERENCES_ERROR",
        500,
        error
      );
    }
  }

  protected mapToSessionUser(client: any) {
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

  protected enrichUserData(client: any) {
    return {
      ...this.mapToSessionUser(client),
      phoneNumber: client.phoneNumber,
      birthDate: client.birthDate,
      gender: client.gender,
      address: client.address,
      preferences: client.preferences,
      clientData: client.clientData,
      acceptTerms: client.acceptTerms,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  private async isEmailAvailable(email: string): Promise<boolean> {
    const client = await ClientModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return !client;
  }

  // 🎯 LISTAR CLIENTES (ADMIN)
  public async listClients(options: {
    page: number;
    limit: number;
    search?: string;
  }) {
    try {
      const { page, limit, search } = options;
      const skip = (page - 1) * limit;

      let query: any = { role: UserMainRole.CLIENT };

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { "fullName.firstName": { $regex: search, $options: "i" } },
          { "fullName.lastName": { $regex: search, $options: "i" } },
        ];
      }

      const clients = await ClientModel.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await ClientModel.countDocuments(query);

      return {
        clients: clients.map((client) => this.enrichUserData(client)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("[ClientService] Erro ao listar clientes:", error);
      throw error;
    }
  }

  // 🎯 ATUALIZAR STATUS DO CLIENTE (ADMIN)
  public async updateClientStatus(clientId: string, status: string) {
    try {
      const validStatuses = Object.values(UserStatus);
      if (!validStatuses.includes(status as UserStatus)) {
        return this.errorResponse("Status inválido", "INVALID_STATUS", 400);
      }

      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        {
          $set: {
            status,
            isActive: status === UserStatus.ACTIVE,
            ...(status !== UserStatus.ACTIVE && { deactivatedAt: new Date() }),
          },
        },
        { new: true, runValidators: true }
      ).select("-password");

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      return this.successResponse(
        this.enrichUserData(client),
        200,
        `Status do cliente atualizado para ${status}`
      );
    } catch (error) {
      console.error("[ClientService] Erro ao atualizar status:", error);
      return this.errorResponse(
        "Erro ao atualizar status",
        "UPDATE_STATUS_ERROR",
        500,
        error
      );
    }
  }

  // ✅ MÉTODO FALTANTE - GET CLIENT BY ID
  public async getClientById(clientId: string) {
    try {
      const client = await ClientModel.findById(clientId).select("-password");

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      return this.successResponse(this.enrichUserData(client));
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar cliente",
        "GET_CLIENT_ERROR",
        500,
        error
      );
    }
  }
}
