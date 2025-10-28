import bcrypt from "bcryptjs";
import { UserBaseService } from "../base/UserBase.service";
import { ClientModel } from "../../../models/user/client/Client.model";
import {
  UserMainRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import { generateUserId } from "../../../utils/generateCustomUserId";

export class ClientService extends UserBaseService {
  protected userModel = ClientModel;

  // ✅ IMPLEMENTAÇÕES DOS MÉTODOS ABSTRATOS OBRIGATÓRIOS
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
      emailVerifiedAt: client.emailVerifiedAt,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  // ✅ IMPLEMENTAÇÃO DO MÉTODO ABSTRATO createSpecificUser
  protected async createSpecificUser(clientData: any) {
    try {
      console.log("🎯 Criando cliente com dados:", {
        email: clientData.email,
        firstName: clientData.fullName?.firstName,
        acceptTerms: clientData.acceptTerms,
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
      const clientId = generateUserId();
      const hashedPassword = await bcrypt.hash(clientData.password, 12);

      // 🎯 CRIAR CLIENTE
      const newClient = await ClientModel.create({
        _id: clientId,
        email: clientData.email.toLowerCase().trim(),
        password: hashedPassword,
        role: UserMainRole.CLIENT,
        status: clientData.status || UserStatus.PENDING_VERIFICATION,
        isActive:
          clientData.isActive !== undefined ? clientData.isActive : false,
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

      console.log(`✅ Cliente criado: ${newClient._id}`);

      const clientResponse = this.enrichUserData(newClient);

      return this.successResponse(
        {
          user: clientResponse,
          tokens:
            clientResponse.status === UserStatus.ACTIVE
              ? {
                  accessToken: `eyJ_cliente_${Date.now()}`,
                  refreshToken: `eyJ_refresh_cliente_${Date.now()}`,
                  expiresIn: 3600,
                }
              : undefined,
        },
        201,
        clientResponse.status === UserStatus.ACTIVE
          ? "Cliente criado com sucesso"
          : "Cliente criado - aguardando verificação de email"
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

  // ✅ MÉTODO PÚBLICO PARA CRIAR CLIENTE (mantido para compatibilidade)
  public async createClient(clientData: any) {
    return this.createSpecificUser(clientData);
  }

  // 🎯 2. ATIVAR CONTA (MÉTODO FALTANTE - ADICIONADO)
  public async activateAccount(clientId: string) {
    try {
      const client = await ClientModel.findById(clientId);
      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
      }

      client.isVerified = true;
      client.isActive = true;
      client.status = UserStatus.ACTIVE;
      client.emailVerifiedAt = new Date();
      await client.save();

      console.log(`✅ Conta ativada: ${client._id}`);

      return this.successResponse(
        this.enrichUserData(client),
        200,
        "Conta ativada com sucesso"
      );
    } catch (error) {
      return this.errorResponse(
        "Erro ao ativar conta",
        "ACTIVATION_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 3. VERIFICAR EMAIL
  public async verifyEmail(token: string) {
    try {
      console.log(`🔐 Verificando email com token: ${token}`);

      const client = await ClientModel.findOne({
        status: UserStatus.PENDING_VERIFICATION,
      });

      if (!client) {
        return this.errorResponse(
          "Token inválido ou expirado",
          "INVALID_TOKEN",
          400
        );
      }

      // ✅ ATIVAR USER
      client.isVerified = true;
      client.isActive = true;
      client.status = UserStatus.ACTIVE;
      client.emailVerifiedAt = new Date();
      await client.save();

      console.log(`✅ Conta ativada: ${client._id}`);

      return this.successResponse(
        this.enrichUserData(client),
        200,
        "Email verificado e conta ativada com sucesso"
      );
    } catch (error) {
      console.error("[ClientService] Erro ao verificar email:", error);
      return this.errorResponse(
        "Erro ao verificar email",
        "EMAIL_VERIFICATION_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 4. PERFIL PÚBLICO DO CLIENTE (MÉTODO FALTANTE - ADICIONADO)
  public async getClientPublicProfile(clientId: string) {
    try {
      const client = await ClientModel.findById(clientId).select(
        "fullName profileImage clientData createdAt isVerified"
      );

      if (!client) {
        return this.errorResponse(
          "Cliente não encontrado",
          "CLIENT_NOT_FOUND",
          404
        );
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
          totalReviews: 0, // Integrar com serviço de reviews depois
          joinedDate: client.createdAt,
          isVerified: client.isVerified,
        },
      };

      return this.successResponse(publicProfile);
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar perfil público",
        "GET_PUBLIC_PROFILE_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 5. BUSCAR CLIENTES PÚBLICO (MÉTODO FALTANTE - ADICIONADO)
  public async searchClientsPublic(
    searchTerm: string,
    options: { page?: number; limit?: number } = {}
  ) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return this.errorResponse(
          "Termo de busca deve ter pelo menos 2 caracteres",
          "INVALID_SEARCH_TERM",
          400
        );
      }

      const query = {
        role: UserMainRole.CLIENT,
        $or: [
          { "fullName.firstName": { $regex: searchTerm, $options: "i" } },
          { "fullName.lastName": { $regex: searchTerm, $options: "i" } },
          { "fullName.displayName": { $regex: searchTerm, $options: "i" } },
        ],
        isActive: true,
        status: UserStatus.ACTIVE,
      };

      const clients = await ClientModel.find(query)
        .select("fullName profileImage clientData createdAt isVerified")
        .skip(skip)
        .limit(limit)
        .sort({ "fullName.displayName": 1 });

      const total = await ClientModel.countDocuments(query);

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
    } catch (error) {
      return this.errorResponse(
        "Erro ao buscar clientes",
        "SEARCH_CLIENTS_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 6. ATUALIZAR PONTOS DE FIDELIDADE
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

  // 🎯 7. REGISTRAR ATENDIMENTO
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

  // 🎯 8. ATUALIZAR PREFERÊNCIAS
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

  // 🎯 9. LISTAR CLIENTES (ADMIN)
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

      return this.successResponse({
        clients: clients.map((client) => this.enrichUserData(client)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[ClientService] Erro ao listar clientes:", error);
      return this.errorResponse(
        "Erro ao listar clientes",
        "LIST_CLIENTS_ERROR",
        500,
        error
      );
    }
  }

  // 🎯 10. ATUALIZAR STATUS (ADMIN)
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

  // 🎯 11. OBTER CLIENTE POR ID
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

  // ✅ MÉTODO AUXILIAR PARA BADGES (PRIVADO)
  private getClientBadges(client: any): string[] {
    const badges: string[] = [];

    if (client.isVerified) {
      badges.push("verified");
    }

    const loyaltyPoints = client.clientData?.loyaltyPoints || 0;
    if (loyaltyPoints >= 1000) {
      badges.push("vip");
    } else if (loyaltyPoints >= 500) {
      badges.push("regular");
    } else if (loyaltyPoints >= 100) {
      badges.push("newbie");
    }

    const totalAppointments = client.clientData?.totalAppointments || 0;
    if (totalAppointments >= 50) {
      badges.push("frequent_visitor");
    } else if (totalAppointments >= 10) {
      badges.push("active_client");
    }

    return badges;
  }

  // ✅ MÉTODO AUXILIAR PARA VERIFICAR EMAIL (PROTECTED - compatível com UserBaseService)
  protected async isEmailAvailable(email: string): Promise<boolean> {
    const client = await ClientModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return !client;
  }
}