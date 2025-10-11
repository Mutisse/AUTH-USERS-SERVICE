import bcrypt from "bcryptjs";
import { UserBaseService } from "../base/UserBase.service";
import { ClientModel } from "../../../models/user/client/Client.model";
import {
  UserMainRole,
  UserStatus,
} from "../../../models/interfaces/user.roles";
import generateCustomUserId from "../../../utils/generateCustomUserId";

export class ClientService extends UserBaseService {
  protected userModel = ClientModel;

  public async createClient(clientData: any) {
    try {
      if (!clientData.fullName?.firstName) {
        return this.errorResponse("Nome é obrigatório", "INVALID_NAME", 400);
      }

      if (!(await this.isEmailAvailable(clientData.email))) {
        return this.errorResponse("Email já cadastrado", "EMAIL_EXISTS", 409);
      }

      const clientId = generateCustomUserId(UserMainRole.CLIENT);
      const hashedPassword = await bcrypt.hash(clientData.password, 12);

      const newClient = await ClientModel.create({
        _id: clientId,
        ...clientData,
        password: hashedPassword,
        role: UserMainRole.CLIENT,
        status: UserStatus.ACTIVE,
        isActive: true,
        isVerified: false,
        fullName: {
          firstName: clientData.fullName.firstName,
          lastName: clientData.fullName.lastName || "",
          displayName:
            clientData.fullName.displayName ||
            `${clientData.fullName.firstName} ${
              clientData.fullName.lastName || ""
            }`.trim(),
        },
        clientData: {
          loyaltyPoints: 0,
          totalAppointments: 0,
          preferences: {
            favoriteServices: [],
            preferredStylists: [],
            allergyNotes: "",
            specialRequirements: "",
          },
          ...clientData.clientData,
        },
      });

      console.log(`✅ Cliente criado: ${newClient._id}`);
      return this.successResponse(
        this.mapToSessionUser(newClient),
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
      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        { $set: updates },
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

      let query = {};

      if (search) {
        query = {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { "fullName.firstName": { $regex: search, $options: "i" } },
            { "fullName.lastName": { $regex: search, $options: "i" } },
          ],
        };
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
      const client = await ClientModel.findByIdAndUpdate(
        clientId,
        {
          $set: {
            status,
            isActive: status === "active",
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
  // ✅ ADICIONAR MÉTODO FALTANTE
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
