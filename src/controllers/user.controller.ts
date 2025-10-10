import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  EmailVerificationDto,
  UserMainRole,
  EmployeeSubRole,
  Role,
} from "../models/interfaces/interfaces.user";
import { UserModel } from '../models/user.model'; // ou o caminho correto do seu model

export class UserController {
  private userService: UserService;

  constructor(userService?: UserService) {
    this.userService = userService || new UserService();
  }

  // UserController - função normalizeRole simplificada
  private normalizeRole(roleInput: string): string {
    const roleMap: { [key: string]: string } = {
      salon_owner: UserMainRole.EMPLOYEE,
      salon_manager: UserMainRole.EMPLOYEE,
      salon_staff: UserMainRole.EMPLOYEE,
      client: UserMainRole.CLIENT,
      admin_system: UserMainRole.ADMINSYSTEM,
      admin: UserMainRole.ADMINSYSTEM,
      employee: UserMainRole.EMPLOYEE,
    };

    const normalizedRole = roleMap[roleInput] || UserMainRole.CLIENT;

    const isValidRole = (role: string): boolean => {
      return Object.values(UserMainRole).includes(role as UserMainRole);
    };

    if (!isValidRole(normalizedRole)) {
      throw new Error(
        `Tipo de usuário inválido após normalização: ${normalizedRole}`
      );
    }

    return normalizedRole;
  }

  // No método createUser:
  async createUser(req: Request, res: Response) {
    try {
      const userData: CreateUserDto = req.body;

      const normalizedData = {
        ...userData,
        role: this.normalizeRole(userData.role),
        originalRole: userData.role, // ← Passa o role original
      };

      const result = await this.userService.createUser(normalizedData);
      return res.status(result.statusCode || 201).json(result);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("Tipo de usuário inválido")
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: "INVALID_ROLE",
          statusCode: 400,
        });
      }
      this.handleServerError(res, error, "Create User");
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const credentials: LoginDto = req.body;
      const result = await this.userService.authenticate(credentials);

      if (!result.success) {
        const statusCode =
          result.code === "ACCOUNT_LOCKED"
            ? 423
            : result.code === "INVALID_CREDENTIALS"
            ? 401
            : result.statusCode || 400;
        return res.status(statusCode).json(result);
      }

      const responseWithTokens = {
        ...result,
        token: this.generateAuthToken(result.data!.id),
        refreshToken: this.generateRefreshToken(result.data!.id),
      };

      return res.status(200).json(responseWithTokens);
    } catch (error) {
      this.handleServerError(res, error, "Login");
    }
  }

  public async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await this.userService.getCompleteUserData(userId);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      this.handleServerError(res, error, "Get Profile");
    }
  }

  public async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates: UpdateUserDto = req.body;

      // ✅ TAMBÉM NORMALIZA O ROLE NO UPDATE (se fornecido)
      if (updates.role) {
        updates.role = this.normalizeRole(updates.role);
      }

      // Verifica se o usuário está atualizando seu próprio perfil ou é admin
      if (req.user.id !== id && req.user.role !== "admin_system") {
        return res.status(403).json({
          success: false,
          error: "Não autorizado",
          code: "FORBIDDEN",
          statusCode: 403,
        });
      }

      const result = await this.userService.updateUser(id, updates);
      return res.status(result.statusCode || 200).json(result);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("Tipo de usuário inválido")
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: "INVALID_ROLE",
          statusCode: 400,
        });
      }
      this.handleServerError(res, error, "Update User");
    }
  }

  public async updatePreferences(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const preferences = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          error: "Não autorizado",
          code: "FORBIDDEN",
          statusCode: 403,
        });
      }

      const result = await this.userService.updateUserPreferences(
        id,
        preferences
      );
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      this.handleServerError(res, error, "Update Preferences");
    }
  }

  public async verifyEmail(req: Request, res: Response) {
    try {
      const { token, email } = req.body as EmailVerificationDto;
      const result = await this.userService.verifyEmail(token, email);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      this.handleServerError(res, error, "Verify Email");
    }
  }

  public async verifyCredentials(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Email e senha são obrigatórios",
          code: "MISSING_CREDENTIALS",
          statusCode: 400,
        });
      }

      const result = await this.userService.authenticate({ email, password });

      if (!result.success) {
        const statusCode = result.code === "ACCOUNT_LOCKED" ? 423 : 401;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("[UserController] Erro ao verificar credenciais:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "SERVER_ERROR",
        statusCode: 500,
      });
    }
  }

  public async updateStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { isOnline } = req.body;

      if (typeof isOnline !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "O campo 'isOnline' deve ser booleano.",
          code: "INVALID_STATUS",
          statusCode: 400,
        });
      }

      const result = await this.userService.updateOnlineStatus(
        userId,
        isOnline
      );

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      this.handleServerError(res, error, "Update Status");
    }
  }

  private handleServerError(res: Response, error: unknown, context: string) {
    console.error(`[UserController] Erro em ${context}:`, error);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
      code: "SERVER_ERROR",
      statusCode: 500,
    });
  }
  // Adicione esta importação (verifique o caminho correto)

  // E modifique o método updateUserActivity para:
  async updateUserActivity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { lastActivity } = req.body;

      console.log("📝 Atualizando atividade do usuário:", userId, lastActivity);

      // Validação simples
      if (!userId || userId.trim() === "") {
        throw new AppError(
          "ID do usuário é obrigatório",
          400,
          "USER_ID_REQUIRED"
        );
      }

      const updateData: any = {
        updatedAt: new Date(),
        lastActivity: lastActivity ? new Date(lastActivity) : new Date(),
      };

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      res.status(200).json({
        success: true,
        data: user,
        statusCode: 200,
        message: "Atividade do usuário atualizada com sucesso",
      });
    } catch (error) {
      next(error);
    }
  }
  private generateAuthToken(userId: string): string {
    // Implementação real usando JWT ou similar
    return "generated.jwt.token";
  }

  private generateRefreshToken(userId: string): string {
    // Implementação real de refresh token
    return "generated.refresh.token";
  }
}
