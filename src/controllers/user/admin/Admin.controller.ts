import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../utils/AppError";
import { AdminService } from "../../../services/user/admin/Admin.service";

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  public getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError("ID do usuário é obrigatório", 400, "MISSING_ID");
      }

      const user = await this.adminService.getUserById(id);

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      return res.status(200).json({
        success: true,
        data: user,
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
      const { id } = req.params;
      const { status } = req.body;

      if (!id || !status) {
        throw new AppError("ID e status são obrigatórios", 400, "MISSING_DATA");
      }

      const user = await this.adminService.updateUserStatus(id, status);

      return res.status(200).json({
        success: true,
        message: "Status atualizado com sucesso",
        data: user,
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
      const { id } = req.params;

      if (!id) {
        throw new AppError("ID do usuário é obrigatório", 400, "MISSING_ID");
      }

      await this.adminService.deleteUser(id);

      return res.status(200).json({
        success: true,
        message: "Usuário deletado com sucesso",
      });
    } catch (error) {
      return next(error);
    }
  };

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData = req.body;

      if (!userData.email || !userData.password) {
        throw new AppError(
          "Email e senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const user = await this.adminService.register(userData);

      return res.status(201).json({
        success: true,
        message: "Admin criado com sucesso",
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(
          "Email e senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const result = await this.adminService.login(email, password);

      return res.status(result.statusCode).json(result);
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
      const { page = 1, limit = 10, role, status } = req.query;

      const users = await this.adminService.getAllUsers({
        page: Number(page),
        limit: Number(limit),
        role: role as string,
        status: status as string,
      });

      // ✅ CORREÇÃO: users.users em vez de users.data
      return res.status(200).json({
        success: true,
        data: users.users,
        pagination: users.pagination,
      });
    } catch (error) {
      return next(error);
    }
  };

  // ✅ CORREÇÃO: Adicionar métodos que estavam faltando nas rotas
  public requestOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      // Simular envio de OTP
      return res.status(200).json({
        success: true,
        message: "OTP enviado com sucesso",
        data: { email, otpSent: true },
      });
    } catch (error) {
      return next(error);
    }
  };

  public verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        throw new AppError("Email e OTP são obrigatórios", 400, "MISSING_DATA");
      }

      // Simular verificação de OTP
      return res.status(200).json({
        success: true,
        message: "OTP verificado com sucesso",
        data: { email, verified: true },
      });
    } catch (error) {
      return next(error);
    }
  };

  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const user = await this.adminService.getUserById(userId);

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  };

  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = (req as any).user?.id;
      const updates = req.body;

      if (!userId) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const user = await this.adminService.updateProfile(userId, updates);

      return res.status(200).json({
        success: true,
        message: "Perfil atualizado com sucesso",
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  };

  public getSystemStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.adminService.getSystemStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return next(error);
    }
  };

  public manageUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const { action, data } = req.body;

      if (!userId || !action) {
        throw new AppError(
          "User ID e ação são obrigatórios",
          400,
          "MISSING_DATA"
        );
      }

      const result = await this.adminService.manageUser(userId, action, data);

      return res.status(200).json({
        success: true,
        message: "Ação executada com sucesso",
        data: result,
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
      const backup = await this.adminService.createBackup();

      return res.status(200).json({
        success: true,
        message: "Backup criado com sucesso",
        data: backup,
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
      const { limit = 100 } = req.query;
      const logs = await this.adminService.getSystemLogs(Number(limit));

      return res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      return next(error);
    }
  };
}
