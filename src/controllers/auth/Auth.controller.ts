// AUTHUSERS-SERVICE/src/controllers/auth/Auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../../services/auth/Auth.service";
import { ClientController } from "../user/client/Client.controller";
import { EmployeeController } from "../user/employee/Employee.controller";
import { AdminController } from "../user/admin/Admin.controller";
import { UserMainRole } from "../../models/interfaces/user.roles";

export class AuthController {
  private authService: AuthService;
  private clientController: ClientController;
  private employeeController: EmployeeController;
  private adminController: AdminController;

  constructor() {
    this.authService = new AuthService();
    this.clientController = new ClientController();
    this.employeeController = new EmployeeController();
    this.adminController = new AdminController();
  }

  // 🎯 ORQUESTRAÇÃO DE REGISTRO POR ROLE
  public startRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { role, email, subRole, ...otherData } = req.body;

      console.log(
        `🎯 [AuthController] Iniciando registro para: ${email}, role: ${role}, subRole: ${subRole}`
      );

      // ✅ ORQUESTRAÇÃO POR ROLE
      switch (role) {
        case UserMainRole.CLIENT:
          return this.clientController.startRegistration(req, res, next);
        case UserMainRole.EMPLOYEE:
          // ✅ VALIDAR SUBROLE PARA EMPLOYEE
          if (!subRole) {
            return res.status(400).json({
              success: false,
              error: "subRole é obrigatório para employees",
              code: "MISSING_SUBROLE",
            });
          }
          return this.employeeController.startRegistration(req, res, next);
        case UserMainRole.ADMINSYSTEM:
          return this.adminController.startRegistration(req, res, next);
        default:
          return res.status(400).json({
            success: false,
            error: "Tipo de usuário não suportado",
            code: "INVALID_ROLE",
          });
      }
    } catch (error) {
      console.error("[AuthController] Erro no start registration:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ LOGIN
  public login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const requestInfo = {
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        isSecure: req.secure || req.get("X-Forwarded-Proto") === "https",
      };

      const result = await this.authService.login(email, password, requestInfo);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no login:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ REFRESH TOKEN
  public refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      const requestInfo = {
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      };

      const result = await this.authService.refreshToken(
        refreshToken,
        requestInfo
      );

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no refresh token:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ LOGOUT
  public logout = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;

      const logoutData = {
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        reason: "user_logout",
      };

      const result = await this.authService.logout(sessionId, logoutData);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no logout:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ FORGOT PASSWORD
  public forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const result = await this.authService.forgotPassword(email);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no forgot password:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ RESET PASSWORD
  public resetPassword = async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;

      const result = await this.authService.resetPassword(
        email,
        code,
        newPassword
      );

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no reset password:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ VERIFY TOKEN
  public verifyToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const result = await this.authService.verifyToken(token);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro na verificação de token:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ VERIFY RESET TOKEN
  public verifyResetToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const result = await this.authService.verifyResetToken(token);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error(
        "[AuthController] Erro na verificação de reset token:",
        error
      );
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ GET ACTIVE SESSIONS
  public getActiveSessions = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "ID do usuário é obrigatório",
          code: "MISSING_USER_ID",
        });
      }

      const result = await this.authService.getActiveSessions(userId);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro ao buscar sessões ativas:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ REVOKE SESSION
  public revokeSession = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "ID do usuário é obrigatório",
          code: "MISSING_USER_ID",
        });
      }

      const revokeData = {
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      };

      const result = await this.authService.revokeSession(
        sessionId,
        userId,
        revokeData
      );

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro ao revogar sessão:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ SEND VERIFICATION (para verificação de email disponível)
  public sendVerification = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email é obrigatório",
          code: "MISSING_EMAIL",
        });
      }

      const result = await this.authService.sendVerification(email);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no send verification:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ VERIFY ACCOUNT (para verificação de conta)
  public verifyAccount = async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          error: "Email e código são obrigatórios",
          code: "MISSING_CREDENTIALS",
        });
      }

      const result = await this.authService.verifyAccount(email, code);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro na verificação de conta:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ VALIDATE CREDENTIALS (para validação interna)
  public validateCredentials = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Email e senha são obrigatórios",
          code: "MISSING_CREDENTIALS",
        });
      }

      const result = await this.authService.validateCredentials(email, password);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("[AuthController] Erro na validação de credenciais:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };
}

// ✅ EXPORT DEFAULT para evitar problemas de importação
export default AuthController;