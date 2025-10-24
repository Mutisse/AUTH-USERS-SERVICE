// AUTH-USERS-SERVICE/src/controllers/user/client/Client.controller.ts
import { Request, Response, NextFunction } from "express";
import { ClientService } from "../../../services/user/client/Client.service";
import { ClientModel } from "../../../models/user/client/Client.model";
import { UserBaseController } from "../base/UserBase.controller";
import { UserStatus } from "../../../models/interfaces/user.roles";
import { AppError } from "../../../utils/AppError";

export class ClientController extends UserBaseController {
  protected userService = new ClientService();
  protected userType = "Cliente";
  protected flowType = "client_registration";

  constructor() {
    super();
    console.log(
      "🎯 ClientController initialized - Register method available:",
      !!this.register
    );
  }

  // ✅ IMPLEMENTAÇÃO DOS MÉTODOS ABSTRATOS
  protected async validateSpecificData(
    data: any
  ): Promise<{ error: string; code: string } | null> {
    // Cliente não tem validações específicas adicionais
    return null;
  }

  protected getDefaultStatus(): UserStatus {
    return UserStatus.VERIFIED;
  }

  protected getAdditionalRegistrationData(data: any): any {
    // Dados específicos do cliente durante o registro
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

  protected getAdditionalStartRegistrationData(data: any): any {
    // Cliente não tem dados adicionais no start registration
    return {};
  }

  // ✅ IMPLEMENTAÇÃO DOS MÉTODOS DE AUTORIZAÇÃO
  protected checkAuthorization(
    currentUser: any,
    targetUserId?: string
  ): boolean {
    if (!currentUser) return false;

    // Admin tem acesso total
    if (currentUser.role === "admin_system") return true;

    // Employee pode acessar alguns recursos
    if (currentUser.role === "employee") return true;

    // Cliente só pode acessar seus próprios recursos
    if (currentUser.role === "client") {
      return currentUser.id === targetUserId;
    }

    return false;
  }

  protected unauthorizedResponse(): any {
    return {
      success: false,
      error: "Não autorizado",
      code: "UNAUTHORIZED_ACCESS",
    };
  }

  // 🎯 VERIFICAR EMAIL
  public verifyEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token } = req.params;

      const result = await this.userService.verifyEmail(token);

      if (!result.success) {
        const errorResult = result as { success: false; error: string };
        throw new AppError(
          errorResult.error || "Token inválido ou expirado",
          400,
          "INVALID_TOKEN"
        );
      }

      res.json({
        success: true,
        message: "Email verificado com sucesso! Sua conta foi ativada.",
        data: (result as any).data,
      });
    } catch (error) {
      next(error);
    }
  };

  // 🎯 ATUALIZAR PREFERÊNCIAS
  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = (req as any).user?.id;
      const { preferences } = req.body;

      if (!clientId) {
        throw new AppError("Não autenticado", 401, "UNAUTHORIZED");
      }

      if (!preferences || typeof preferences !== "object") {
        throw new AppError(
          "Preferências devem ser um objeto válido",
          400,
          "INVALID_PREFERENCES"
        );
      }

      const result = await this.userService.updatePreferences(
        clientId,
        preferences
      );

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR PONTOS DE FIDELIDADE (ADMIN)
  public updateLoyaltyPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const { points } = req.body;

      if (typeof points !== "number") {
        throw new AppError("Pontos devem ser um número", 400, "INVALID_POINTS");
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, clientId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updateLoyaltyPoints(
        clientId,
        points
      );

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 REGISTRAR ATENDIMENTO (EMPLOYEE/ADMIN)
  public recordAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, clientId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.recordAppointment(clientId);

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 PERFIL PÚBLICO DO CLIENTE
  public getClientPublicProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const result = await this.userService.getClientPublicProfile(clientId);

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 BUSCAR CLIENTES (PÚBLICO)
  public searchClients = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
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
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LISTAR CLIENTES DESTAQUES (PÚBLICO)
  public getFeaturedClients = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { limit = 8 } = req.query;

      const featuredClients = await ClientModel.find({
        role: "client",
        isActive: true,
        status: UserStatus.ACTIVE,
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
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 MÉTODO AUXILIAR PARA BADGES
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

  // 🎯 LISTAR CLIENTES (ADMIN)
  public listClients = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const result = await this.userService.listClients({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR STATUS DO CLIENTE (ADMIN)
  public updateClientStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== "string") {
        throw new AppError("Status é obrigatório", 400, "INVALID_STATUS");
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, clientId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updateClientStatus(
        clientId,
        status
      );

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 EXCLUIR CLIENTE (SOFT DELETE - ADMIN)
  public deleteClient = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;
      const deletedBy = (req as any).user?.id;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, clientId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.softDeleteUser(clientId, deletedBy);

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 RESTAURAR CLIENTE (ADMIN)
  public restoreClient = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, clientId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.restoreUser(clientId);

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 EXCLUIR PERMANENTEMENTE (HARD DELETE - ADMIN)
  public hardDeleteClient = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { clientId } = req.params;

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser, clientId)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.hardDeleteUser(clientId);

      if (!result.success) {
        const errorResult = result as {
          success: false;
          error: string;
          statusCode?: number;
        };
        return res.status(errorResult.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };
}
