// AUTH-USERS-SERVICE/src/controllers/user/admin/Admin.controller.ts
import { Request, Response, NextFunction } from "express";
import { AdminService } from "../../../services/user/admin/Admin.service";
import { UserBaseController } from "../base/UserBase.controller";
import { UserStatus } from "../../../models/interfaces/user.roles";
import { AppError } from "../../../utils/AppError";

export class AdminController extends UserBaseController {
  protected userService = new AdminService();
  protected userType = "Admin";
  protected flowType = "admin_registration";

  constructor() {
    super();
  }

  // ✅ IMPLEMENTAÇÃO DOS MÉTODOS ABSTRATOS
  protected async validateSpecificData(data: any): Promise<{ error: string; code: string } | null> {
    // Admin não tem validações específicas adicionais
    return null;
  }

  protected getDefaultStatus(): UserStatus {
    return UserStatus.ACTIVE; // Admin já ativo por padrão
  }

  protected getAdditionalRegistrationData(data: any): any {
    // Dados específicos do admin durante o registro
    return {
      adminData: {
        permissions: data.adminData?.permissions || ['read', 'write'],
        accessLevel: data.adminData?.accessLevel || 'basic',
        lastSystemAccess: new Date(),
        isSuperAdmin: data.adminData?.isSuperAdmin || false
      }
    };
  }

  protected getAdditionalStartRegistrationData(data: any): any {
    // Admin não tem dados adicionais no start registration
    return {};
  }

  // ✅ IMPLEMENTAÇÃO DOS MÉTODOS DE AUTORIZAÇÃO
  protected checkAuthorization(currentUser: any, targetUserId?: string): boolean {
    if (!currentUser) return false;
    
    // Apenas admin_system tem acesso total
    return currentUser.role === 'admin_system';
  }

  protected unauthorizedResponse(): any {
    return {
      success: false,
      error: "Acesso restrito a administradores do sistema",
      code: "ADMIN_ACCESS_REQUIRED"
    };
  }

  // 🎯 MÉTODOS ESPECÍFICOS DO ADMIN

  // 🎯 ATUALIZAR PERMISSÕES
  public updatePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { adminId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        throw new AppError(
          "Permissões devem ser uma lista",
          400,
          "INVALID_PERMISSIONS"
        );
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updatePermissions(
        adminId,
        permissions
      );
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR NÍVEL DE ACESSO
  public updateAccessLevel = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { adminId } = req.params;
      const { accessLevel } = req.body;

      const validAccessLevels = ["full", "limited", "readonly"];
      if (!accessLevel || !validAccessLevels.includes(accessLevel)) {
        throw new AppError(
          "Nível de acesso inválido",
          400,
          "INVALID_ACCESS_LEVEL"
        );
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updateAccessLevel(
        adminId,
        accessLevel
      );
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 LISTAR ADMINS
  public listAdmins = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 10, search, accessLevel } = req.query;

      const result = await this.userService.listAdmins({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        accessLevel: accessLevel as string,
      });

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 ATUALIZAR STATUS DO ADMIN
  public updateAdminStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { adminId } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== "string") {
        throw new AppError("Status é obrigatório", 400, "INVALID_STATUS");
      }

      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      const result = await this.userService.updateAdminStatus(adminId, status);

      if (!result.success) {
        return res.status(result.statusCode || 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 REGISTRAR ACESSO AO SISTEMA
  public recordSystemAccess = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const adminId = (req as any).user?.id;

      if (!adminId) {
        throw new AppError("Não autenticado", 401, "UNAUTHORIZED");
      }

      const result = await this.userService.recordSystemAccess(adminId);
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 MÉTODOS LEGACY (MANTIDOS PARA COMPATIBILIDADE)
  public getSystemStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public updateUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  // 🎯 MÉTODOS DE GESTÃO DE CONTAS
  public activateAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;
      
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public deactivateAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;
      
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public createBackup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };

  public getSystemLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentUser = (req as any).user;
      if (!this.checkAuthorization(currentUser)) {
        return res.status(403).json(this.unauthorizedResponse());
      }

      // 🚧 IMPLEMENTAÇÃO FUTURA
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED"
      });
    } catch (error) {
      return next(error);
    }
  };
}