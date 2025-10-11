import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError";
import { AuthService } from "../../services/auth/Auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // 🎯 LOGIN
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

      const result = await this.authService.login(email, password, {
        ip: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        isSecure: req.secure,
      });

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 REFRESH TOKEN
  public refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError(
          "Refresh token é obrigatório",
          400,
          "MISSING_REFRESH_TOKEN"
        );
      }

      const result = await this.authService.refreshToken(refreshToken, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 VERIFICAR TOKEN
  public verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        throw new AppError("Token não fornecido", 400, "MISSING_TOKEN");
      }

      const result = await this.authService.verifyToken(token);

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 LOGOUT
  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.headers["x-session-id"] as string;

      const result = await this.authService.logout(sessionId, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        reason: "manual_logout",
      });

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 ESQUECI MINHA SENHA
  public forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const result = await this.authService.forgotPassword(email);

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 REDEFINIR SENHA
  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        throw new AppError(
          "Email, código e nova senha são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const result = await this.authService.resetPassword(
        email,
        code,
        newPassword
      );

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 VERIFICAR TOKEN DE REDEFINIÇÃO (MÉTODO QUE ESTAVA FALTANDO)
  public verifyResetToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError("Token é obrigatório", 400, "MISSING_TOKEN");
      }

      const result = await this.authService.verifyResetToken(token);

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 ENVIAR VERIFICAÇÃO DE EMAIL (MÉTODO QUE ESTAVA FALTANDO)
  public sendVerification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = (req as any).user;
      const { email } = req.body;

      if (!user && !email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const targetEmail = email || user.email;
      const name = user?.name || "usuário";

      const result = await this.authService.sendVerification(targetEmail, name);

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 VERIFICAR CONTA (MÉTODO QUE ESTAVA FALTANDO)
  public verifyAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = (req as any).user;
      const { email, code } = req.body;

      if (!user && !email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const targetEmail = email || user.email;

      const result = await this.authService.verifyAccount(targetEmail, code);

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 OBTER SESSÃO ATUAL (MÉTODO QUE ESTAVA FALTANDO)
  public getSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = (req as any).user;

      if (!user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            subRole: user.subRole,
            isVerified: user.isVerified,
          },
          session: {
            authenticated: true,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 🎯 OBTER SESSÕES ATIVAS (MÉTODO QUE ESTAVA FALTANDO)
  public getActiveSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = (req as any).user;

      if (!user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.authService.getActiveSessions(user.id);

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  // 🎯 REVOGAR SESSÃO (MÉTODO QUE ESTAVA FALTANDO)
  public revokeSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      if (!user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const result = await this.authService.revokeSession(sessionId, user.id, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };
}
