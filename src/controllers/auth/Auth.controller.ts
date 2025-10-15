import { Request, Response } from "express";
import { AuthService } from "../../services/auth/Auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

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

  // ✅ SEND VERIFICATION (OTP)
  public sendVerification = async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;

      const result = await this.authService.sendVerification(email, name);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro no envio de verificação:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ✅ VERIFY ACCOUNT (OTP)
  public verifyAccount = async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;

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

  // ✅ GET SESSION
  public getSession = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;

      // Implementar lógica para buscar sessão específica
      return res.status(501).json({
        success: false,
        error: "Método não implementado",
        code: "NOT_IMPLEMENTED",
      });
    } catch (error) {
      console.error("[AuthController] Erro ao buscar sessão:", error);
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

  // ✅ CHECK EMAIL AVAILABILITY (NOVO MÉTODO)
  public checkEmailAvailability = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email é obrigatório",
          code: "MISSING_EMAIL",
        });
      }

      const result = await this.authService.checkEmailAvailability(email);

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      console.error("[AuthController] Erro ao verificar email:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  };
}
